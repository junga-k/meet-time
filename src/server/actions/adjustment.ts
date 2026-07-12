"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { generateTimeSlotInputs, shortlistTopSlots } from "@/lib/scheduling";
import { createNotification } from "@/lib/notifications";
import type { ActionResult } from "@/server/actions/meetings";

const EXTEND_DAYS = 7;

async function requireOrganizer(meetingId: string) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.organizerId !== user.id) throw new Error("주최자만 할 수 있어요.");
  return meeting;
}

export async function changeParticipantRoleAction(
  meetingId: string,
  participantId: string,
  role: "필수" | "선택"
): Promise<ActionResult> {
  await requireOrganizer(meetingId);
  await prisma.participant.update({ where: { id: participantId }, data: { role } });
  await shortlistTopSlots(meetingId);
  return { ok: true, data: undefined };
}

export async function extendCandidateRangeAction(meetingId: string): Promise<ActionResult> {
  const meeting = await requireOrganizer(meetingId);
  const newEnd = addDays(meeting.candidateEndDate, EXTEND_DAYS);
  const additionalStart = addDays(meeting.candidateEndDate, 1);
  const newSlots = generateTimeSlotInputs(additionalStart, newEnd, meeting.durationMinutes);

  await prisma.meeting.update({ where: { id: meetingId }, data: { candidateEndDate: newEnd } });
  if (newSlots.length > 0) {
    await prisma.timeSlot.createMany({ data: newSlots.map((s) => ({ ...s, meetingId })) });
  }
  await shortlistTopSlots(meetingId);

  const participants = await prisma.participant.findMany({ where: { meetingId } });
  for (const p of participants) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "재조율",
      message: `"${meeting.title}" 후보 기간이 ${EXTEND_DAYS}일 연장됐어요.`,
    });
  }
  return { ok: true, data: undefined };
}

export async function changeRoomBookingAction(meetingId: string, roomId: string): Promise<ActionResult> {
  const meeting = await requireOrganizer(meetingId);
  if (!meeting.confirmedSlotId) return { ok: false, error: "아직 확정된 시간이 없어요." };
  const slot = await prisma.timeSlot.findUniqueOrThrow({ where: { id: meeting.confirmedSlotId } });

  await prisma.roomBooking.upsert({
    where: { meetingId },
    create: { meetingId, roomId, startTime: slot.startTime, endTime: slot.endTime, status: "확정" },
    update: { roomId, startTime: slot.startTime, endTime: slot.endTime, status: "확정" },
  });

  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  const participants = await prisma.participant.findMany({ where: { meetingId, confirmationStatus: { not: "불참" } } });
  for (const p of participants) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "회의실확정",
      message: `"${meeting.title}" 회의실이 "${room.name}"(으)로 변경됐어요.`,
    });
  }
  return { ok: true, data: undefined };
}

export async function setModeOnlineAction(meetingId: string): Promise<ActionResult> {
  const meeting = await requireOrganizer(meetingId);
  const videoLink = meeting.videoLink ?? `https://meet.example.com/${meetingId}`;
  await prisma.meeting.update({ where: { id: meetingId }, data: { mode: "온라인", videoLink } });
  await prisma.roomBooking.updateMany({ where: { meetingId }, data: { status: "취소" } });

  const participants = await prisma.participant.findMany({ where: { meetingId, confirmationStatus: { not: "불참" } } });
  for (const p of participants) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "회의실확정",
      message: `"${meeting.title}"이(가) 온라인 회의로 전환됐어요.`,
    });
  }
  return { ok: true, data: undefined };
}

export async function findAvailableRooms(meetingId: string) {
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  const allRooms = await prisma.room.findMany({
    orderBy: { capacity: "asc" },
    include: { bookings: { where: { status: "확정", meetingId: { not: meetingId } } } },
  });
  if (!meeting.confirmedSlotId) return allRooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, available: false }));
  const slot = await prisma.timeSlot.findUniqueOrThrow({ where: { id: meeting.confirmedSlotId } });
  const attendeeCount = await prisma.participant.count({ where: { meetingId, confirmationStatus: { not: "불참" } } });

  return allRooms.map((r) => {
    const fitsCapacity = r.capacity !== null && r.capacity >= attendeeCount;
    const overlaps = r.bookings.some(
      (b) => b.startTime.getTime() < slot.endTime.getTime() && b.endTime.getTime() > slot.startTime.getTime()
    );
    return { id: r.id, name: r.name, capacity: r.capacity, available: fitsCapacity && !overlaps };
  });
}
