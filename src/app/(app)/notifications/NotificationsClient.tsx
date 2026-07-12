"use client";

import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/server/actions/notifications";

type NotificationItem = {
  id: string;
  typeLabel: string;
  message: string;
  meetingTitle: string;
  createdAt: Date;
  isRead: boolean;
  href: string;
};

export function NotificationsClient({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const unreadCount = items.filter((i) => !i.isRead).length;

  function handleClick(item: NotificationItem) {
    (async () => {
      if (!item.isRead) await markNotificationReadAction(item.id);
      router.push(item.href);
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="page-header" style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-light)" }}>
        <div className="page-header-top" style={{ marginBottom: 0 }}>
          <span className="page-title">알림</span>
          <span className={`page-subtitle${unreadCount === 0 ? " all-read" : ""}`} style={unreadCount === 0 ? { color: "var(--accent-green)" } : undefined}>
            {unreadCount === 0 ? "모두 확인함" : `안 읽음 ${unreadCount}건`}
          </span>
        </div>
      </div>

      <div className="notif-list">
        {items.length === 0 && <div className="empty-hint">알림이 없어요</div>}
        {items.map((item) => (
          <button key={item.id} type="button" className="notif-item" onClick={() => handleClick(item)}>
            <span className={`notif-dot-marker${item.isRead ? " hidden-marker" : ""}`} />
            <div className="notif-main">
              <div className="notif-top-line">
                <span className={`notif-meeting-title${item.isRead ? "" : " unread"}`}>{item.meetingTitle}</span>
                <span className="notif-time">
                  {item.createdAt.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <div className={`notif-message${item.isRead ? "" : " unread"}`}>{item.message}</div>
              <span className="notif-type-tag">{item.typeLabel}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
