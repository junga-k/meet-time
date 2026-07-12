"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

export type SubHeaderAttendee = {
  userName: string;
  userProfileImageUrl?: string | null;
  userDepartment?: string | null;
  userRank?: string | null;
  userPosition?: string | null;
  roleBadge: string;
};

export function SubHeader({ title, backHref, attendee }: { title: string; backHref?: string; attendee?: SubHeaderAttendee }) {
  const router = useRouter();
  const handleBack = () => (backHref ? router.push(backHref) : router.back());

  const backButton = (
    <button type="button" className="back-arrow" aria-label="뒤로가기" onClick={handleBack}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );

  if (!attendee) {
    return (
      <div className="sub-header">
        {backButton}
        <span className="sub-header-title">{title}</span>
      </div>
    );
  }

  const meta = [attendee.userDepartment, attendee.userRank, attendee.userPosition].filter(Boolean).join(" ");

  return (
    <div className="sub-header sub-header-with-attendee">
      <div className="sub-header-top-row">
        <div className="sub-header-left">
          {backButton}
          <span className="sub-header-title">{title}</span>
        </div>
        <div className="sub-header-user-row">
          <Avatar name={attendee.userName} profileImageUrl={attendee.userProfileImageUrl} size="sm" />
          <span className="sub-header-user-name">{attendee.userName}</span>
        </div>
      </div>
      {meta && <div className="sub-header-meta">{meta}</div>}
      <div className="sub-header-badge-row">
        <span className="role-badge">{attendee.roleBadge}</span>
      </div>
    </div>
  );
}
