"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";
import { isPendingReconfirm, resolveMeetingCardHref, type MeetingCardVM as BaseMeetingCardVM } from "@/lib/meetingCard";

export type MeetingCardVM = BaseMeetingCardVM & { sortKey: number };

type Filter = "전체" | "조율중" | "확정" | "종료";

const STATUS_LABEL: Record<string, { cls: string; text: string }> = {
  제안중: { cls: "badge-blue", text: "제안중" },
  확정: { cls: "badge-green", text: "확정" },
  재조율중: { cls: "badge-red", text: "재조율중" },
  취소: { cls: "badge-gray", text: "취소" },
};

function getStatusBadge(vm: MeetingCardVM) {
  if (isPendingReconfirm(vm)) return { cls: "badge-amber", text: "재확인 대기" };
  return STATUS_LABEL[vm.status];
}

function getFilterCategory(vm: MeetingCardVM): Filter {
  if (vm.status === "취소" || vm.isEnded) return "종료";
  if (isPendingReconfirm(vm)) return "조율중";
  if (vm.status === "확정") return "확정";
  return "조율중";
}

function isWaitingOnly(vm: MeetingCardVM) {
  return vm.status === "제안중" && vm.stage === "필수응답중" && vm.myRole === "선택";
}

function isUnresponded(vm: MeetingCardVM) {
  if (vm.status === "제안중" && vm.stage === "필수응답중" && (vm.myRole === "필수" || vm.myRole === "주최자")) return !vm.myRespondedAt;
  if (vm.status === "제안중" && vm.stage === "선택확인중" && vm.myRole === "선택") return !vm.myRespondedAt;
  return false;
}

export function MeetingListClient({ meetings }: { meetings: MeetingCardVM[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("전체");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return meetings
      .filter((vm) => filter === "전체" || getFilterCategory(vm) === filter)
      .filter((vm) => !search || vm.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [meetings, filter, search]);

  const countLabel = filter === "전체" && !search ? `총 ${meetings.length}건` : `${filtered.length}건`;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div className="page-header-top">
          <span className="page-title">내 회의</span>
          <span className="page-subtitle">{countLabel}</span>
        </div>
      </div>

      <div className="search-row">
        <div className="search-input-wrap">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input className="search-input" placeholder="회의 제목으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="filter-row">
        {(["전체", "조율중", "확정", "종료"] as Filter[]).map((f) => (
          <div key={f} className={`filter-chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div className="hint" style={{ textAlign: "center", padding: "40px 0", lineHeight: 1.6 }}>
            {search ? "검색 결과가 없어요." : "해당하는 회의가 없어요."}
          </div>
        )}

        {filtered.map((vm) => {
          const href = resolveMeetingCardHref(vm);
          const clickable = Boolean(href);
          const st = getStatusBadge(vm);
          const unresponded = isUnresponded(vm);

          return (
            <div
              key={vm.meetingId}
              className={`card${clickable ? " card-clickable" : ""}`}
              style={{ opacity: clickable ? 1 : 0.85 }}
              onClick={() => href && router.push(href)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{vm.title}</span>
                {clickable && (
                  <span style={{ flexShrink: 0, color: "var(--muted)", marginTop: 2 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                <span className="role-badge">{vm.myRole}</span>
                <span className={`badge ${st.cls}`}>{st.text}</span>
                {vm.status === "제안중" && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{vm.stage}</span>}
                {vm.hasRegisteredNote && (
                  <span className="badge badge-purple">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h9l5 5v13H6z" />
                      <path d="M15 3v5h5M9 12h6M9 16h6" />
                    </svg>
                    회의록
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: "var(--muted)" }}>
                {vm.confirmedStartTime && vm.confirmedEndTime ? (
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {formatMeetingDate(vm.confirmedStartTime)} {formatTimeRange(vm.confirmedStartTime, vm.confirmedEndTime)}
                  </span>
                ) : isWaitingOnly(vm) ? (
                  <span>대기 중</span>
                ) : (
                  <span />
                )}
                {unresponded && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-red)", display: "flex", alignItems: "center", gap: 3 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16.2v.1" />
                    </svg>
                    미응답
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
