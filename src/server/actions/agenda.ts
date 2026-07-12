"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import type { ActionResult } from "@/server/actions/meetings";

const agendaSchema = z.object({
  title: z.string().min(1, "안건 제목을 입력해주세요."),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  attachmentUrl: z.string().optional(),
});

async function notifyOthers(meetingId: string, authorId: string, message: string, type: "안건등록" | "안건수정" | "안건삭제") {
  const participants = await prisma.participant.findMany({ where: { meetingId, userId: { not: authorId } } });
  for (const p of participants) {
    await createNotification({ userId: p.userId, meetingId, type, message });
  }
}

export async function createAgenda(
  meetingId: string,
  input: z.infer<typeof agendaSchema>
): Promise<ActionResult<{ agendaId: string }>> {
  const user = await requireCurrentUser();
  const parsed = agendaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };

  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  const agenda = await prisma.agenda.create({
    data: { meetingId, authorId: user.id, ...parsed.data },
  });
  await notifyOthers(meetingId, user.id, `"${meeting.title}"에 새 안건 "${agenda.title}"이 등록됐어요.`, "안건등록");
  return { ok: true, data: { agendaId: agenda.id } };
}

export async function updateAgenda(agendaId: string, input: z.infer<typeof agendaSchema>): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const parsed = agendaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };

  const agenda = await prisma.agenda.findUniqueOrThrow({ where: { id: agendaId }, include: { meeting: true } });
  if (agenda.authorId !== user.id) return { ok: false, error: "작성자만 수정할 수 있어요." };

  await prisma.agenda.update({ where: { id: agendaId }, data: parsed.data });
  await notifyOthers(agenda.meetingId, user.id, `"${agenda.meeting.title}"의 안건 "${parsed.data.title}"이 수정됐어요.`, "안건수정");
  return { ok: true, data: undefined };
}

export async function deleteAgenda(agendaId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const agenda = await prisma.agenda.findUniqueOrThrow({ where: { id: agendaId }, include: { meeting: true } });
  if (agenda.authorId !== user.id) return { ok: false, error: "작성자만 삭제할 수 있어요." };

  await prisma.agenda.delete({ where: { id: agendaId } });
  await notifyOthers(agenda.meetingId, user.id, `"${agenda.meeting.title}"의 안건 "${agenda.title}"이 삭제됐어요.`, "안건삭제");
  return { ok: true, data: undefined };
}
