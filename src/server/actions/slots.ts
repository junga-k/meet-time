"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { computeMeetingMode } from "@/lib/scheduling";
import { progressMeetingStage } from "@/server/actions/meetings";
import type { SlotResponseStatus, AttendanceMode } from "@/lib/enums";
import type { ActionResult } from "@/server/actions/meetings";

export async function upsertSlotResponse(
  meetingId: string,
  timeSlotId: string,
  status: SlotResponseStatus
): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.id } },
  });
  if (!participant) return { ok: false, error: "이 회의의 참석자가 아니에요." };

  await prisma.slotResponse.upsert({
    where: { timeSlotId_userId: { timeSlotId, userId: user.id } },
    create: { timeSlotId, userId: user.id, status },
    update: { status },
  });
  return { ok: true, data: undefined };
}

export async function setAttendanceMode(
  meetingId: string,
  mode: AttendanceMode
): Promise<ActionResult<{ modeRecomputed: boolean }>> {
  const user = await requireCurrentUser();
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.id } },
  });
  if (!participant) return { ok: false, error: "이 회의의 참석자가 아니에요." };

  const wasAlreadyCompleted = Boolean(participant.respondedAt);
  await prisma.participant.update({ where: { id: participant.id }, data: { attendanceMode: mode } });

  const isRequired = participant.role === "필수" || participant.role === "주최자";
  let modeRecomputed = false;
  if (isRequired && wasAlreadyCompleted) {
    const requiredParticipants = await prisma.participant.findMany({
      where: { meetingId, role: { in: ["필수", "주최자"] } },
    });
    const newMode = computeMeetingMode(
      requiredParticipants.map((p) => (p.id === participant.id ? mode : (p.attendanceMode as AttendanceMode | null) ?? "무관"))
    );
    await prisma.meeting.update({ where: { id: meetingId }, data: { mode: newMode } });
    modeRecomputed = true;
  }

  return { ok: true, data: { modeRecomputed } };
}

export async function submitResponseComplete(meetingId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.id } },
  });
  if (!participant) return { ok: false, error: "이 회의의 참석자가 아니에요." };

  await prisma.participant.update({ where: { id: participant.id }, data: { respondedAt: new Date() } });
  await progressMeetingStage(meetingId);

  return { ok: true, data: undefined };
}
