"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/reservations",
    label: "예약",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/meetings",
    label: "내 회의",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "알림",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10.5a6 6 0 1112 0c0 4.2 1.5 5.5 1.5 5.5h-15S6 14.7 6 10.5z" />
        <path d="M9.7 18.5a2.3 2.3 0 004.6 0" />
      </svg>
    ),
    badgeKey: "notifications" as const,
  },
  {
    href: "/profile",
    label: "내 정보",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.8" />
        <path d="M4.5 20c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" />
      </svg>
    ),
  },
];

export function TabBar({ hasUnreadNotifications }: { hasUnreadNotifications: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} className={`tab-bar-item${active ? " active" : ""}`}>
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badgeKey === "notifications" && hasUnreadNotifications && <span className="dot-badge" />}
          </Link>
        );
      })}
    </nav>
  );
}
