"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { advanceRescheduleCount, RescheduleCapReachedError, computeMeetingMode } from "@/lib/scheduling";
import { createNotification } from "@/lib/notifications";
import type { ActionResult } from "@/server/actions/meetings";
import type { AttendanceMode } from "@/lib/enums";

async function getMyParticipant(meetingId: string) {
  const user = await requireCurrentUser();
  const participant = await prisma.participant.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.id } },
  });
  if (!participant) throw new Error("이 회의의 참석자가 아니에요.");
  return { user, participant };
}

/** 참석 형태(대면/온라인) 변경 반영 공통 로직 — 필수참석자면 회의 전체 형태(Meeting.mode)도 재계산한다 */
async function applyReconfirmedAttendanceMode(meetingId: string, mode: "대면" | "온라인"): Promise<void> {
  const { participant } = await getMyParticipant(meetingId);
  await prisma.participant.update({
    where: { id: participant.id },
    data: { attendanceMode: mode, reconfirmedAt: new Date() },
  });

  const isRequired = participant.role === "필수" || participant.role === "주최자";
  if (isRequired) {
    const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
    const requiredParticipants = await prisma.participant.findMany({
      where: { meetingId, role: { in: ["필수", "주최자"] } },
    });
    const newMode = computeMeetingMode(
      requiredParticipants.map((p) => (p.id === participant.id ? mode : (p.attendanceMode as AttendanceMode | null) ?? "대면"))
    );
    if (newMode !== meeting.mode) {
      const videoLink =
        (newMode === "온라인" || newMode === "하이브리드") && !meeting.videoLink
          ? `https://meet.example.com/${meetingId}`
          : meeting.videoLink;
      await prisma.meeting.update({ where: { id: meetingId }, data: { mode: newMode, videoLink } });
    }
  }
}

/** 화면8: 참석 형태 변경 — 온라인으로 전환 */
export async function reconfirmOnlineAction(meetingId: string): Promise<ActionResult> {
  await applyReconfirmedAttendanceMode(meetingId, "온라인");
  return { ok: true, data: undefined };
}

/** 화면8: 참석 형태 변경 — 대면으로 전환 */
export async function reconfirmOfflineAction(meetingId: string): Promise<ActionResult> {
  await applyReconfirmedAttendanceMode(meetingId, "대면");
  return { ok: true, data: undefined };
}

/** 화면8: 참석 확정 — 기존 참석 형태 그대로 재확인만 완료 */
export async function reconfirmAction(meetingId: string): Promise<ActionResult> {
  const { participant } = await getMyParticipant(meetingId);
  await prisma.participant.update({
    where: { id: participant.id },
    data: { reconfirmedAt: new Date() },
  });
  return { ok: true, data: undefined };
}

/** 화면8 옵션2: 대리 참석자 지정 */
export async function setDelegateAction(meetingId: string, delegateUserId: string): Promise<ActionResult> {
  const { participant } = await getMyParticipant(meetingId);
  await prisma.participant.update({
    where: { id: participant.id },
    data: { delegateUserId, reconfirmedAt: new Date() },
  });
  return { ok: true, data: undefined };
}

const declineSchema = z.object({ reason: z.string().min(1, "불참 사유를 입력해주세요.") });

/** 화면8 옵션3: 불참 통보 */
export async function declineWithReasonAction(
  meetingId: string,
  input: { reason: string }
): Promise<ActionResult<{ escalated: boolean }>> {
  const { user, participant } = await getMyParticipant(meetingId);
  const parsed = declineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };

  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });

  await prisma.participant.update({
    where: { id: participant.id },
    data: { confirmationStatus: "불참", declineReason: parsed.data.reason, reconfirmedAt: new Date() },
  });

  const isRequired = participant.role === "필수" || participant.role === "주최자";

  if (!isRequired) {
    await createNotification({
      userId: user.id,
      meetingId,
      type: "불참안내",
      message: `"${meeting.title}" 불참으로 기록됐어요. 회의 시작부터 회의록을 확인할 수 있어요.`,
    });
    return { ok: true, data: { escalated: false } };
  }

  try {
    await advanceRescheduleCount(meetingId);
    const participants = await prisma.participant.findMany({ where: { meetingId } });
    for (const p of participants) {
      await createNotification({
        userId: p.userId,
        meetingId,
        type: "재조율",
        message: `"${meeting.title}" 필수 참석자 불참으로 재조율이 시작됐어요.`,
      });
    }
    return { ok: true, data: { escalated: false } };
  } catch (e) {
    if (e instanceof RescheduleCapReachedError) {
      await createNotification({
        userId: meeting.organizerId,
        meetingId,
        type: "재조율",
        message: `"${meeting.title}" 재조율 한도에 도달했어요. 담당자 확인이 필요해요.`,
      });
      return { ok: true, data: { escalated: true } };
    }
    throw e;
  }
}

/** 화면9: 참석으로 변경 (압축 후보 전부 불가/불참 상태였던 참석자의 예외적 재전환) */
export async function revertToConfirmedAction(meetingId: string): Promise<ActionResult> {
  const { participant } = await getMyParticipant(meetingId);
  await prisma.participant.update({
    where: { id: participant.id },
    data: { confirmationStatus: "확정", declineReason: null },
  });
  return { ok: true, data: undefined };
}
