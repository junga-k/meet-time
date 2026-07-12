"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/meetings";

const createSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요."),
  assigneeUserId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export async function createActionItemAction(
  meetingId: string,
  input: z.infer<typeof createSchema>
): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };

  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.id } },
  });
  if (!participant) return { ok: false, error: "이 회의의 참석자가 아니에요." };

  await prisma.actionItem.create({
    data: {
      meetingId,
      content: parsed.data.content,
      assigneeUserId: parsed.data.assigneeUserId || null,
      dueDate: parsed.data.dueDate ?? null,
      createdBy: user.id,
    },
  });
  return { ok: true, data: undefined };
}

export async function toggleActionItemDoneAction(actionItemId: string): Promise<ActionResult> {
  await requireCurrentUser();
  const item = await prisma.actionItem.findUniqueOrThrow({ where: { id: actionItemId } });
  await prisma.actionItem.update({ where: { id: actionItemId }, data: { isDone: !item.isDone } });
  return { ok: true, data: undefined };
}

export async function deleteActionItemAction(actionItemId: string): Promise<ActionResult> {
  await requireCurrentUser();
  await prisma.actionItem.delete({ where: { id: actionItemId } });
  return { ok: true, data: undefined };
}
