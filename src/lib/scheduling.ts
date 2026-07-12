import { prisma } from "@/lib/prisma";
import { addDays, isWeekday, startOfDay } from "@/lib/dates";
import type { AttendanceMode, MeetingMode } from "@/lib/enums";
import { createNotification } from "@/lib/notifications";

const SHORTLIST_SIZE = 5;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20; // 슬롯 그리드 가정 범위(09:00~20:00) — 문서에 명시되지 않아 와이어프레임 관례를 따름
const RESCHEDULE_CAP = 3; // 자동 1회 + 수동 2회

export class RescheduleCapReachedError extends Error {
  constructor() {
    super("재조율 한도(자동 1회 + 수동 2회)에 도달했어요. 담당자에게 문의해주세요.");
  }
}

/**
 * candidateStartDate~candidateEndDate 사이 평일에 대해 30분 간격 시작 시각의 TIME_SLOT을 생성한다.
 * 각 슬롯의 end_time은 start_time + durationMinutes(회의 길이가 가변이므로 고정 1시간 전제 금지).
 * 하루 중 슬롯은 09:00~20:00 사이, "시작 시각 + durationMinutes"가 20:00을 넘지 않는 범위로 제한한다.
 */
export function generateTimeSlotInputs(
  candidateStartDate: Date,
  candidateEndDate: Date,
  durationMinutes: number
): { startTime: Date; endTime: Date }[] {
  const slots: { startTime: Date; endTime: Date }[] = [];
  let day = startOfDay(candidateStartDate);
  const lastDay = startOfDay(candidateEndDate);

  while (day.getTime() <= lastDay.getTime()) {
    if (isWeekday(day)) {
      let cursor = new Date(day);
      cursor.setHours(DAY_START_HOUR, 0, 0, 0);
      const dayEndBoundary = new Date(day);
      dayEndBoundary.setHours(DAY_END_HOUR, 0, 0, 0);

      while (true) {
        const end = new Date(cursor.getTime() + durationMinutes * 60_000);
        if (end.getTime() > dayEndBoundary.getTime()) break;
        slots.push({ startTime: new Date(cursor), endTime: end });
        cursor = new Date(cursor.getTime() + 30 * 60_000);
      }
    }
    day = addDays(day, 1);
  }

  return slots;
}

/**
 * 온라인/오프라인/하이브리드 계산 — db_model_mvp.md "회의 모드 자동 계산" 규칙 그대로.
 * '무관'은 어느 쪽으로도 강제하지 않는 중립표. 온라인 선택자 0명이면 대면+무관이 섞여도 오프라인.
 */
export function computeMeetingMode(attendanceModes: (AttendanceMode | null)[]): MeetingMode {
  const hasOnline = attendanceModes.some((m) => m === "온라인");
  const hasOffline = attendanceModes.some((m) => m === "대면");
  if (!hasOnline) return "오프라인";
  if (!hasOffline) return "온라인";
  return "하이브리드";
}

export type SlotScore = {
  timeSlotId: string;
  startTime: Date;
  hardPass: boolean;
  unavailCount: number;
};

/** 필수 참석자 기준으로 각 슬롯의 하드패스 여부·불편도(unavailCount)를 계산한다 */
export async function scoreSlotsForMeeting(meetingId: string): Promise<SlotScore[]> {
  const [slots, requiredParticipants] = await Promise.all([
    prisma.timeSlot.findMany({
      where: { meetingId },
      include: { slotResponses: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.participant.findMany({
      where: { meetingId, role: { in: ["필수", "주최자"] } },
    }),
  ]);

  const requiredUserIds = requiredParticipants.map((p) => p.userId);

  return slots.map((slot) => {
    let hardBlockCount = 0;
    let unavailCount = 0;
    for (const userId of requiredUserIds) {
      const response = slot.slotResponses.find((r) => r.userId === userId);
      const status = response?.status ?? "가능"; // 응답 없으면 기본값 "가능"
      if (status === "불가") {
        hardBlockCount += 1;
        unavailCount += 2;
      } else if (status === "기피") {
        unavailCount += 1;
      }
    }
    return {
      timeSlotId: slot.id,
      startTime: slot.startTime,
      hardPass: hardBlockCount === 0,
      unavailCount,
    };
  });
}

export function rankSlots(scores: SlotScore[]): SlotScore[] {
  return [...scores].sort((a, b) => {
    if (a.hardPass !== b.hardPass) return a.hardPass ? -1 : 1;
    if (a.unavailCount !== b.unavailCount) return a.unavailCount - b.unavailCount;
    return a.startTime.getTime() - b.startTime.getTime();
  });
}

/** 필수 참석자 응답 마감(조기 포함) 시점 — 상위 5개 TIME_SLOT을 is_shortlisted=true로 압축 */
export async function shortlistTopSlots(meetingId: string): Promise<void> {
  const scores = await scoreSlotsForMeeting(meetingId);
  const ranked = rankSlots(scores);
  const shortlistedIds = new Set(ranked.slice(0, SHORTLIST_SIZE).map((s) => s.timeSlotId));

  await prisma.$transaction([
    prisma.timeSlot.updateMany({ where: { meetingId }, data: { isShortlisted: false } }),
    ...(shortlistedIds.size > 0
      ? [
          prisma.timeSlot.updateMany({
            where: { id: { in: Array.from(shortlistedIds) } },
            data: { isShortlisted: true },
          }),
        ]
      : []),
  ]);
}

/**
 * 최종 확정 슬롯 선택 — 단일 알고리즘. 하드 제약(필수 참석자 '불가') 통과 후보 중 unavailCount 최솟값.
 * ignoreHardConstraints=true면 하드 제약 없이 압축 후보 전체에서 unavailCount 최솟값(화면7 강제 확정용).
 * 하드 제약 통과 후보가 하나도 없으면 null을 반환(호출자가 triggerMitigationSequence를 실행해야 함).
 */
export async function selectFinalSlot(
  meetingId: string,
  options: { ignoreHardConstraints?: boolean } = {}
): Promise<string | null> {
  const scores = await scoreSlotsForMeeting(meetingId);
  const shortlisted = await prisma.timeSlot.findMany({
    where: { meetingId, isShortlisted: true },
    select: { id: true },
  });
  const shortlistedIds = new Set(shortlisted.map((s) => s.id));
  const candidates = scores.filter((s) => shortlistedIds.has(s.timeSlotId));

  const pool = options.ignoreHardConstraints ? candidates : candidates.filter((c) => c.hardPass);
  if (pool.length === 0) return null;

  const ranked = rankSlots(pool);
  return ranked[0].timeSlotId;
}

/** 인원 충족 + 해당 시간에 겹치는 확정 예약이 없는 회의실을 조회(생성하지 않음) */
export async function matchRoomForSlot(
  startTime: Date,
  endTime: Date,
  attendeeCount: number,
  excludeMeetingId?: string
) {
  const rooms = await prisma.room.findMany({
    where: { capacity: { gte: attendeeCount } },
    orderBy: { capacity: "asc" },
    include: {
      bookings: {
        where: {
          status: "확정",
          ...(excludeMeetingId ? { meetingId: { not: excludeMeetingId } } : {}),
        },
      },
    },
  });

  for (const room of rooms) {
    const overlaps = room.bookings.some(
      (b) => b.startTime.getTime() < endTime.getTime() && b.endTime.getTime() > startTime.getTime()
    );
    if (!overlaps) return room;
  }
  return null;
}

/**
 * 회의 확정 단일 진입점 — confirmedSlotId 세팅, 상태 전환, 참석자 confirmation_status 일괄 확정,
 * 모드 재검증, 회의실/화상링크 생성, 관련 알림 발송까지 한 번에 처리한다.
 */
export async function confirmMeetingSlot(meetingId: string, slotId: string) {
  const [meeting, slot, participants] = await Promise.all([
    prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } }),
    prisma.timeSlot.findUniqueOrThrow({ where: { id: slotId } }),
    prisma.participant.findMany({ where: { meetingId }, include: { user: true } }),
  ]);

  const requiredModes = participants
    .filter((p) => p.role === "필수" || p.role === "주최자")
    .map((p) => (p.attendanceMode as AttendanceMode | null) ?? "무관");
  const mode = computeMeetingMode(requiredModes);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { confirmedSlotId: slotId, status: "확정", stage: "확정", mode },
  });

  await prisma.participant.updateMany({
    where: { meetingId, confirmationStatus: { not: "불참" } },
    data: { confirmationStatus: "확정" },
  });

  const attendees = participants.filter((p) => p.confirmationStatus !== "불참");

  let roomName: string | null = null;
  if (mode === "오프라인" || mode === "하이브리드") {
    const room = await matchRoomForSlot(slot.startTime, slot.endTime, attendees.length, meetingId);
    if (room) {
      await prisma.roomBooking.upsert({
        where: { meetingId },
        create: {
          meetingId,
          roomId: room.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "확정",
        },
        update: { roomId: room.id, startTime: slot.startTime, endTime: slot.endTime, status: "확정" },
      });
      roomName = room.name;
    }
  }

  let videoLink = meeting.videoLink;
  if ((mode === "온라인" || mode === "하이브리드") && !videoLink) {
    videoLink = `https://meet.example.com/${meetingId}`;
    await prisma.meeting.update({ where: { id: meetingId }, data: { videoLink } });
  }

  for (const p of participants) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "시간확정",
      message: `"${meeting.title}" 회의 시간이 확정됐어요.`,
    });
  }
  for (const p of attendees) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "참석재확인",
      message: `"${meeting.title}" 확정된 일정에 대한 참석 여부를 재확인해주세요.`,
    });
  }
  if (roomName) {
    for (const p of attendees) {
      await createNotification({
        userId: p.userId,
        meetingId,
        type: "회의실확정",
        message: `"${meeting.title}" 회의실이 "${roomName}"(으)로 확정됐어요.`,
      });
    }
  }
}

/**
 * 하드패스 슬롯이 없을 때 사람 기준 순차 완화요청을 생성한다.
 * 대상 슬롯은 현재 unavailCount가 가장 낮은(가장 유력한) 압축 후보로 고정하고,
 * 그 슬롯에 '불가'로 답한 필수 참석자를 순서대로 한 명씩 요청한다.
 * 이미 대기 중인 요청이 있으면 새로 만들지 않고 그대로 반환한다.
 */
export async function triggerMitigationSequence(meetingId: string) {
  const pending = await prisma.mitigationRequest.findFirst({
    where: { meetingId, status: "대기" },
  });
  if (pending) return pending;

  const scores = await scoreSlotsForMeeting(meetingId);
  const shortlisted = await prisma.timeSlot.findMany({
    where: { meetingId, isShortlisted: true },
    select: { id: true },
  });
  const shortlistedIds = new Set(shortlisted.map((s) => s.id));
  const candidates = rankSlots(scores.filter((s) => shortlistedIds.has(s.timeSlotId)));
  if (candidates.length === 0) return null;

  const targetSlotId = candidates[0].timeSlotId;

  const [slotResponses, requiredParticipants, alreadyAsked] = await Promise.all([
    prisma.slotResponse.findMany({ where: { timeSlotId: targetSlotId, status: "불가" } }),
    prisma.participant.findMany({ where: { meetingId, role: { in: ["필수", "주최자"] } } }),
    prisma.mitigationRequest.findMany({ where: { meetingId, timeSlotId: targetSlotId } }),
  ]);

  const requiredUserIds = new Set(requiredParticipants.map((p) => p.userId));
  const askedUserIds = new Set(alreadyAsked.map((m) => m.targetUserId));

  const blockerUserId = slotResponses
    .map((r) => r.userId)
    .find((userId) => requiredUserIds.has(userId) && !askedUserIds.has(userId));

  if (!blockerUserId) return null; // 이 슬롯의 모든 차단자에게 이미 요청을 마쳤음(전원 '유지' 상태)

  const created = await prisma.mitigationRequest.create({
    data: { meetingId, timeSlotId: targetSlotId, targetUserId: blockerUserId, status: "대기" },
  });

  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  await createNotification({
    userId: blockerUserId,
    meetingId,
    type: "완화요청",
    message: `"${meeting.title}" 일정 조율을 위해 변경 요청이 도착했어요.`,
  });

  return created;
}

/**
 * 완화요청(변경요청) 응답 — 화면 6·7이 공유하는 단일 함수.
 * '수락': 해당 SlotResponse를 '가능'으로 변경하고 재평가.
 * '유지': 같은 슬롯의 다음 차단자에게 순차 요청, 더 없으면 주최자에게 알림(수동 조정 필요).
 */
export async function respondToMitigation(mitigationRequestId: string, decision: "수락" | "유지") {
  const request = await prisma.mitigationRequest.findUniqueOrThrow({
    where: { id: mitigationRequestId },
    include: { meeting: true },
  });

  await prisma.mitigationRequest.update({
    where: { id: mitigationRequestId },
    data: { status: decision, respondedAt: new Date() },
  });

  if (decision === "수락") {
    await prisma.slotResponse.upsert({
      where: { timeSlotId_userId: { timeSlotId: request.timeSlotId, userId: request.targetUserId } },
      create: { timeSlotId: request.timeSlotId, userId: request.targetUserId, status: "가능" },
      update: { status: "가능" },
    });
    await shortlistTopSlots(request.meetingId);
    const finalSlot = await selectFinalSlot(request.meetingId);
    if (!finalSlot) {
      await triggerMitigationSequence(request.meetingId);
    }
    return { resolved: Boolean(finalSlot) };
  }

  // 유지 — 같은 슬롯의 다음 차단자에게 순차 요청
  const next = await triggerMitigationSequence(request.meetingId);
  if (!next) {
    await createNotification({
      userId: request.meeting.organizerId,
      meetingId: request.meetingId,
      type: "완화요청",
      message: `"${request.meeting.title}" 완화요청 대상 전원이 일정을 유지했어요. 수동 조정이 필요해요.`,
    });
  }
  return { resolved: false };
}

/**
 * 재조율 횟수 캡(자동 1회 + 수동 2회, 총 3회) 강제. 최초 1회는 무조건 자동으로 취급하고,
 * 이후로는 호출자가 무엇을 넘기든 수동으로 기록한다(캡 도달 시 예외 발생 → 담당자 에스컬레이션 UI로 전환).
 */
export async function advanceRescheduleCount(meetingId: string) {
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.rescheduleCount >= RESCHEDULE_CAP) {
    throw new RescheduleCapReachedError();
  }
  const nextCount = meeting.rescheduleCount + 1;
  const mode = meeting.rescheduleCount === 0 ? "auto" : "manual";
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { rescheduleCount: nextCount, status: "재조율중", stage: "필수응답중" },
  });
  return { rescheduleCount: nextCount, mode };
}

export function isRescheduleCapReached(rescheduleCount: number): boolean {
  return rescheduleCount >= RESCHEDULE_CAP;
}

const RANK_ORDER = ["사원", "주임", "대리", "과장", "차장", "부장", "이사", "상무", "전무", "부사장", "사장"];

/** 회의록 참석인원 표기 — 직위 순, 동일 직위는 이름 가나다순 */
export function sortParticipantsForMinutes<T extends { rank: string | null; name: string }>(
  participants: T[]
): T[] {
  const rankIndex = (rank: string | null) => {
    const idx = rank ? RANK_ORDER.indexOf(rank) : -1;
    return idx === -1 ? RANK_ORDER.length : idx;
  };
  return [...participants].sort((a, b) => {
    const diff = rankIndex(b.rank) - rankIndex(a.rank); // 직위 높은 순
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "ko");
  });
}
