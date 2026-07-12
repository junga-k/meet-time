import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";
import { SubHeader } from "@/components/ui/SubHeader";
import { Avatar } from "@/components/ui/Avatar";
import { RevertToConfirmedButton } from "./RevertToConfirmedButton";

export default async function MeetingDetailPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      confirmedSlot: true,
      roomBooking: { include: { room: true } },
      participants: { include: { user: true } },
      agendas: { include: { author: true }, orderBy: [{ isRequired: "desc" }, { createdAt: "asc" }] },
      meetingNote: true,
    },
  });
  if (!meeting) notFound();

  const myParticipant = meeting.participants.find((p) => p.userId === user.id);
  if (!myParticipant) redirect("/meetings");

  const now = Date.now();
  const meetingStarted = meeting.confirmedSlot ? meeting.confirmedSlot.startTime.getTime() <= now : false;
  const meetingEnded = meeting.confirmedSlot ? meeting.confirmedSlot.endTime.getTime() <= now : false;
  const canRevert =
    myParticipant.confirmationStatus === "불참" &&
    meeting.confirmedSlot &&
    meeting.confirmedSlot.startTime.getTime() > now;

  const gcalUrl = meeting.confirmedSlot
    ? (() => {
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const params = new URLSearchParams({
          action: "TEMPLATE",
          text: meeting.title,
          dates: `${fmt(meeting.confirmedSlot.startTime)}/${fmt(meeting.confirmedSlot.endTime)}`,
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
      })()
    : null;

  const requiredParticipants = meeting.participants.filter((p) => p.role === "필수" || p.role === "주최자");
  const optionalParticipants = meeting.participants.filter((p) => p.role === "선택");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="회의 상세"
        backHref="/meetings"
        attendee={{
          userName: user.name,
          userProfileImageUrl: user.profileImageUrl,
          userDepartment: user.department,
          userRank: user.rank,
          userPosition: user.position,
          roleBadge: myParticipant.role,
        }}
      />

      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 10 }}>
          <span className="role-badge" style={meetingEnded ? { borderColor: "var(--muted)", color: "var(--muted)" } : { borderColor: "var(--accent-green)", color: "var(--accent-green)" }}>
            {meetingEnded ? "종료" : meeting.status}
          </span>
          {meeting.meetingNote?.status === "등록" && <span className="badge badge-purple">회의록</span>}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{meeting.title}</div>
      </div>

      <div className="screen-scroll" style={{ paddingTop: 0 }}>
        {meeting.confirmedSlot && (
          <div className="confirmed-banner">
            <div className="confirmed-banner-label">확정된 시간</div>
            <div className="confirmed-banner-time">
              {formatMeetingDate(meeting.confirmedSlot.startTime)} {formatTimeRange(meeting.confirmedSlot.startTime, meeting.confirmedSlot.endTime)}
            </div>
            {meetingEnded && <div className="confirmed-banner-ended">종료된 회의예요</div>}
          </div>
        )}

        <div className="section">
          <div className="info-box">
            {meeting.roomBooking && (
              <div className="info-box-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1" />
                </svg>
                <div>
                  <div className="info-box-main">{meeting.roomBooking.room.name}</div>
                  <div className="info-box-sub">{meeting.roomBooking.room.location}</div>
                </div>
              </div>
            )}
            {meeting.videoLink && (
              <div className="info-box-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                  <path d="M16 10l6-3v10l-6-3" />
                </svg>
                <div className="video-link-line">{meeting.videoLink}</div>
              </div>
            )}
            {!meeting.roomBooking && !meeting.videoLink && <div className="hint">확정된 장소/링크 정보가 없어요</div>}
          </div>
        </div>

        <div className="section">
          <div className="section-title">참석자</div>
          <div className="role-group-label">필수 참석자</div>
          {requiredParticipants.map((p) => (
            <div key={p.id} className={`detail-participant-row${p.userId === user.id ? " me" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Avatar name={p.user.name} profileImageUrl={p.user.profileImageUrl} size="sm" />
                <span>{p.user.name}</span>
                {p.userId === user.id && <span className="me-tag">나</span>}
                <span className="mode-tag">{p.attendanceMode ?? "무관"}</span>
              </div>
              <span className={`resp-chip ${p.confirmationStatus === "확정" ? "done" : p.confirmationStatus === "불참" ? "declined" : "pending"}`}>
                {p.confirmationStatus}
              </span>
            </div>
          ))}
          {optionalParticipants.length > 0 && (
            <>
              <div className="role-group-label">선택 참석자</div>
              {optionalParticipants.map((p) => (
                <div key={p.id} className={`detail-participant-row${p.userId === user.id ? " me" : ""}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Avatar name={p.user.name} profileImageUrl={p.user.profileImageUrl} size="sm" />
                    <span>{p.user.name}</span>
                    {p.userId === user.id && <span className="me-tag">나</span>}
                    <span className="mode-tag">{p.attendanceMode ?? "무관"}</span>
                  </div>
                  <span className={`resp-chip ${p.confirmationStatus === "확정" ? "done" : p.confirmationStatus === "불참" ? "declined" : "pending"}`}>
                    {p.confirmationStatus}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="section">
          <div className="section-title">
            안건
            <Link href={`/meetings/${meeting.id}/agenda`} className="hint" style={{ textDecoration: "underline" }}>
              관리하기
            </Link>
          </div>
          {meeting.agendas.length === 0 && <div className="hint">등록된 안건이 없어요</div>}
          {meeting.agendas.map((a) => (
            <div key={a.id} className="agenda-row">
              <div className="agenda-top-line">
                {a.isRequired && <span className="required-tag">필독</span>}
                <span className="agenda-title">{a.title}</span>
              </div>
              <div className="agenda-author">{a.author.name}</div>
            </div>
          ))}
        </div>

        {myParticipant.confirmationStatus === "불참" && !canRevert && meetingStarted && (
          <div className="notice-box">
            <div className="notice-box-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              불참으로 기록됐어요
            </div>
            회의 시작부터 회의록을 확인할 수 있어요.
          </div>
        )}

        {canRevert && <RevertToConfirmedButton meetingId={meeting.id} />}
      </div>

      <div className="footer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {gcalUrl && (
          <a href={gcalUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: "block", textAlign: "center" }}>
            캘린더에 추가
          </a>
        )}
        {meetingStarted ? (
          <Link href={`/meetings/${meeting.id}/minutes`} className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
            회의록 확인하기
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            회의록 확인하기 (회의 시작 전)
          </button>
        )}
      </div>
    </div>
  );
}
