import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveNotificationRoute } from "@/lib/notifications";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/labels";
import type { NotificationType } from "@/lib/enums";
import { NotificationsClient } from "./NotificationsClient";

export default async function NotificationsPage() {
  const user = await requireCurrentUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { meeting: true },
  });

  const items = await Promise.all(
    notifications.map(async (n) => {
      const participant = await prisma.participant.findUnique({
        where: { meetingId_userId: { meetingId: n.meetingId, userId: user.id } },
      });
      let isPendingMitigationTarget = false;
      if (n.type === "완화요청") {
        const pending = await prisma.mitigationRequest.findFirst({
          where: { meetingId: n.meetingId, targetUserId: user.id, status: "대기" },
        });
        isPendingMitigationTarget = Boolean(pending);
      }
      const href = resolveNotificationRoute({
        meetingId: n.meetingId,
        type: n.type as NotificationType,
        viewerRole: (participant?.role as "필수" | "선택" | "주최자" | null) ?? null,
        isPendingMitigationTarget,
      });
      return {
        id: n.id,
        typeLabel: NOTIFICATION_TYPE_LABELS[n.type as NotificationType] ?? n.type,
        message: n.message,
        meetingTitle: n.meeting.title,
        createdAt: n.createdAt,
        isRead: n.isRead,
        href,
      };
    })
  );

  return <NotificationsClient items={items} />;
}
