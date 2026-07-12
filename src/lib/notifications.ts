import { prisma } from "@/lib/prisma";
import type { NotificationType, ParticipantRole } from "@/lib/enums";

export async function createNotification(input: {
  userId: string;
  meetingId: string;
  type: NotificationType;
  message: string;
}) {
  return prisma.notification.create({ data: input });
}

/**
 * 알림 클릭 시 이동 경로 — screen_specs.md §11 라우팅 표 그대로.
 * 화면1의 "회의록" 배지 우선 라우팅은 이 함수가 아니라 회의 목록 화면 자체에서 별도로 처리한다
 * (그 규칙은 알림이 아니라 회의 카드 클릭에 적용되는 규칙이기 때문).
 */
export function resolveNotificationRoute(params: {
  meetingId: string;
  type: NotificationType;
  viewerRole: ParticipantRole | null;
  isPendingMitigationTarget?: boolean;
}): string {
  const { meetingId, type, viewerRole, isPendingMitigationTarget } = params;
  const base = `/meetings/${meetingId}`;

  if (type === "참석재확인") return `${base}/reconfirm`;

  if (type === "응답요청" || type === "마감임박") {
    if (viewerRole === "필수" || viewerRole === "주최자") return `${base}/respond`;
    if (viewerRole === "선택") return `${base}/shortlist`;
    return base;
  }

  if (type === "완화요청") {
    if (isPendingMitigationTarget) return `${base}/mitigation`;
    return `${base}/dashboard`;
  }

  if (type === "회의록등록") return base;

  // 시간확정/안건등록/안건수정/안건삭제/재조율/불참안내/회의실확정
  if (viewerRole === "주최자") return `${base}/dashboard`;
  return base;
}
