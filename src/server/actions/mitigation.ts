"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { respondToMitigation } from "@/lib/scheduling";
import type { ActionResult } from "@/server/actions/meetings";

export async function respondToMitigationAction(
  mitigationRequestId: string,
  decision: "수락" | "유지"
): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const request = await prisma.mitigationRequest.findUniqueOrThrow({ where: { id: mitigationRequestId } });
  if (request.targetUserId !== user.id) {
    return { ok: false, error: "본인에게 온 변경요청만 응답할 수 있어요." };
  }
  if (request.status !== "대기") {
    return { ok: false, error: "이미 처리된 요청이에요." };
  }
  await respondToMitigation(mitigationRequestId, decision);
  return { ok: true, data: undefined };
}
