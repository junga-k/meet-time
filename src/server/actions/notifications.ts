"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/server/actions/meetings";

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  if (notification.userId !== user.id) return { ok: false, error: "본인의 알림만 확인할 수 있어요." };
  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  return { ok: true, data: undefined };
}
