"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { generateMeetingNoteDraft, AiNotConfiguredError } from "@/lib/ai";
import { createNotification } from "@/lib/notifications";
import type { ActionResult } from "@/server/actions/meetings";

async function ensureMeetingNote(meetingId: string) {
  const existing = await prisma.meetingNote.findUnique({ where: { meetingId } });
  if (existing) return existing;
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  return prisma.meetingNote.create({
    data: { meetingId, authorUserId: meeting.organizerId, status: "임시저장" },
  });
}

async function requireAuthor(meetingId: string) {
  const user = await requireCurrentUser();
  const note = await ensureMeetingNote(meetingId);
  if (note.authorUserId !== user.id) {
    throw new Error("이 회의록은 지정된 작성자만 작성할 수 있어요.");
  }
  return { user, note };
}

export async function saveDraftNoteAction(meetingId: string, content: string): Promise<ActionResult> {
  try {
    await requireAuthor(meetingId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await prisma.meetingNote.update({ where: { meetingId }, data: { content } });
  return { ok: true, data: undefined };
}

export async function registerNoteAction(meetingId: string, content: string): Promise<ActionResult> {
  try {
    await requireAuthor(meetingId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  await prisma.meetingNote.update({
    where: { meetingId },
    data: { content, status: "등록", registeredAt: new Date() },
  });
  const participants = await prisma.participant.findMany({ where: { meetingId } });
  for (const p of participants) {
    await createNotification({
      userId: p.userId,
      meetingId,
      type: "회의록등록",
      message: `"${meeting.title}" 회의록이 등록됐어요.`,
    });
  }
  return { ok: true, data: undefined };
}

export async function reassignNoteAuthorAction(meetingId: string, newAuthorUserId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (meeting.organizerId !== user.id) return { ok: false, error: "주최자만 작성자를 재지정할 수 있어요." };
  await ensureMeetingNote(meetingId);
  await prisma.meetingNote.update({ where: { meetingId }, data: { authorUserId: newAuthorUserId } });
  return { ok: true, data: undefined };
}

export async function generateAiDraftAction(meetingId: string, roughNotes: string): Promise<ActionResult<{ content: string }>> {
  try {
    await requireAuthor(meetingId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!roughNotes.trim()) return { ok: false, error: "회의 내용을 먼저 입력해주세요." };

  try {
    const draft = await generateMeetingNoteDraft(roughNotes);
    await prisma.meetingNote.update({ where: { meetingId }, data: { content: draft, isAiGenerated: true } });
    return { ok: true, data: { content: draft } };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: "AI 초안 생성에 실패했어요. 잠시 후 다시 시도해주세요." };
  }
}
