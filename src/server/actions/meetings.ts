"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { validateCandidateStartDate, hasWeekdayInRange, computeResponseDeadlines } from "@/lib/dates";
import { generateTimeSlotInputs, computeMeetingMode, shortlistTopSlots, selectFinalSlot, confirmMeetingSlot, triggerMitigationSequence } from "@/lib/scheduling";
import { createNotification } from "@/lib/notifications";
import type { ParticipantRole, AttendanceMode } from "@/lib/enums";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

const createMeetingSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  participants: z
    .array(z.object({ userId: z.string(), role: z.enum(["필수", "선택"]) }))
    .min(1, "참석자를 1명 이상 추가해주세요."),
  candidateStartDate: z.coerce.date(),
  candidateEndDate: z.coerce.date(),
  durationMinutes: z.number().int().min(5).max(480).multipleOf(5),
  agendaDeadline: z.coerce.date(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export async function createMeeting(input: CreateMeetingInput): Promise<ActionResult<{ meetingId: string }>> {
  const organizer = await requireCurrentUser();
  const parsed = createMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }
  const { title, participants, candidateStartDate, candidateEndDate, durationMinutes, agendaDeadline } = parsed.data;

  const createdAt = new Date();
  if (candidateEndDate.getTime() < candidateStartDate.getTime()) {
    return { ok: false, error: "종료일은 시작일 이후여야 해요." };
  }
  if (!validateCandidateStartDate(createdAt, candidateStartDate)) {
    return { ok: false, error: "후보 시작일은 오늘로부터 최소 3영업일 이후여야 해요." };
  }
  if (!hasWeekdayInRange(candidateStartDate, candidateEndDate)) {
    return { ok: false, error: "선택한 기간에 평일이 없어 응답 가능한 시간대가 없어요. 평일을 포함해 다시 선택해주세요." };
  }
  if (participants.some((p) => p.userId === organizer.id)) {
    return { ok: false, error: "주최자는 자동으로 참석자에 포함돼요. 별도로 추가하지 않아도 돼요." };
  }

  const { requiredResponseDeadline, optionalResponseDeadline } = computeResponseDeadlines(createdAt, candidateStartDate);
  const slotInputs = generateTimeSlotInputs(candidateStartDate, candidateEndDate, durationMinutes);

  const meeting = await prisma.meeting.create({
    data: {
      title,
      status: "제안중",
      stage: "필수응답중",
      organizerId: organizer.id,
      durationMinutes,
      createdAt,
      candidateStartDate,
      candidateEndDate,
      requiredResponseDeadline,
      optionalResponseDeadline,
      agendaDeadline,
      participants: {
        create: [
          { userId: organizer.id, role: "주최자" },
          ...participants.map((p) => ({ userId: p.userId, role: p.role as ParticipantRole })),
        ],
      },
      timeSlots: { create: slotInputs },
    },
    include: { participants: true },
  });

  for (const p of meeting.participants) {
    const isRequired = p.role === "필수" || p.role === "주최자";
    await createNotification({
      userId: p.userId,
      meetingId: meeting.id,
      type: "응답요청",
      message: isRequired
        ? `"${title}" 회의의 참석 가능 시간을 알려주세요.`
        : `"${title}" 회의에 선택 참석자로 초대됐어요. 필수 참석자 응답이 모이면 알려드릴게요.`,
    });
  }

  return { ok: true, data: { meetingId: meeting.id } };
}

/**
 * 단계 전환 — 필수응답중→선택확인중, 선택확인중→확정.
 * force=false(기본): 대상자 전원 응답완료일 때만 진행(조기 진행 포함).
 * force=true: 대시보드의 "다음 단계로 강제 진행" 버튼에서 사용, 응답 여부와 무관하게 즉시 진행.
 */
export async function progressMeetingStage(meetingId: string, options: { force?: boolean } = {}) {
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });

  if (meeting.stage === "필수응답중") {
    const requiredParticipants = await prisma.participant.findMany({
      where: { meetingId, role: { in: ["필수", "주최자"] } },
    });
    const allDone = requiredParticipants.every((p) => p.respondedAt);
    if (!options.force && !allDone) return { advanced: false };

    await shortlistTopSlots(meetingId);
    const mode = computeMeetingMode(requiredParticipants.map((p) => (p.attendanceMode as AttendanceMode | null) ?? "대면"));
    await prisma.meeting.update({ where: { id: meetingId }, data: { mode, stage: "선택확인중" } });

    const optionalParticipants = await prisma.participant.findMany({ where: { meetingId, role: "선택" } });
    for (const p of optionalParticipants) {
      await createNotification({
        userId: p.userId,
        meetingId,
        type: "응답요청",
        message: `"${meeting.title}" 압축된 후보 시간 중 가능한 시간을 알려주세요.`,
      });
    }

    // 선택 참석자가 없으면 곧바로 다음 단계까지 이어서 진행
    return progressMeetingStage(meetingId, options);
  }

  if (meeting.stage === "선택확인중") {
    const optionalParticipants = await prisma.participant.findMany({ where: { meetingId, role: "선택" } });
    const allDone = optionalParticipants.every((p) => p.respondedAt);
    if (!options.force && optionalParticipants.length > 0 && !allDone) return { advanced: false };

    const shortlistedSlots = await prisma.timeSlot.findMany({ where: { meetingId, isShortlisted: true } });
    for (const p of optionalParticipants) {
      const responses = await prisma.slotResponse.findMany({
        where: { userId: p.userId, timeSlotId: { in: shortlistedSlots.map((s) => s.id) } },
      });
      const allDeclined =
        shortlistedSlots.length > 0 && shortlistedSlots.every((s) => responses.find((r) => r.timeSlotId === s.id)?.status === "불가");
      if (allDeclined) {
        await prisma.participant.update({ where: { id: p.id }, data: { confirmationStatus: "불참" } });
        await createNotification({
          userId: p.userId,
          meetingId,
          type: "불참안내",
          message: `"${meeting.title}" 제시된 후보 시간에 모두 참석이 어려워 불참으로 기록됐어요. 회의 시작부터 회의록을 확인할 수 있어요.`,
        });
      }
    }

    const finalSlotId = await selectFinalSlot(meetingId);
    if (finalSlotId) {
      await confirmMeetingSlot(meetingId, finalSlotId);
      return { advanced: true, confirmed: true };
    }
    await triggerMitigationSequence(meetingId);
    return { advanced: true, confirmed: false };
  }

  return { advanced: false };
}

/** 화면5 "이 시간으로 확정" — 하드 제약 통과 후보 중 최적 슬롯으로 즉시 확정 */
export async function forceConfirmSlot(meetingId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.organizerId !== user.id) return { ok: false, error: "주최자만 확정할 수 있어요." };

  const slotId = await selectFinalSlot(meetingId);
  if (!slotId) return { ok: false, error: "하드 제약을 통과한 후보가 없어요. 완화요청을 먼저 진행해주세요." };
  await confirmMeetingSlot(meetingId, slotId);
  return { ok: true, data: undefined };
}

/** 화면7 "시간 강제 확정" — 하드 제약을 무시하고 unavailCount 최솟값 슬롯으로 확정 */
export async function forceConfirmSlotIgnoringConstraints(meetingId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.organizerId !== user.id) return { ok: false, error: "주최자만 확정할 수 있어요." };

  const slotId = await selectFinalSlot(meetingId, { ignoreHardConstraints: true });
  if (!slotId) return { ok: false, error: "확정할 후보 시간이 없어요." };
  await confirmMeetingSlot(meetingId, slotId);
  return { ok: true, data: undefined };
}

/** 대시보드 "다음 단계로 강제 진행" 버튼 */
export async function forceNextStageAction(meetingId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.organizerId !== user.id) return { ok: false, error: "주최자만 진행할 수 있어요." };
  await progressMeetingStage(meetingId, { force: true });
  return { ok: true, data: undefined };
}
