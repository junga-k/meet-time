"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { progressMeetingStage } from "@/server/actions/meetings";
import type { SlotResponseStatus } from "@/lib/enums";
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
