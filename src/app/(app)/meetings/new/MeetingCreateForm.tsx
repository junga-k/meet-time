"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createMeeting } from "@/server/actions/meetings";
import { addBusinessDays, formatAbsoluteDate } from "@/lib/dates";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { Avatar } from "@/components/ui/Avatar";

type AssignableRole = "필수" | "선택";

type Candidate = {
  id: string;
  name: string;
  department: string | null;
  rank: string | null;
  position: string | null;
  profileImageUrl: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 조직도 내 부서별 인원 정렬 기준 — 직위(연차 높은 순) → 이름 가나다순. 목록에 없는 직위는 맨 뒤로.
const RANK_ORDER = ["부장", "차장", "과장", "대리", "주임", "사원"];
function compareByRankThenName(a: Candidate, b: Candidate) {
  const ai = a.rank ? RANK_ORDER.indexOf(a.rank) : -1;
  const bi = b.rank ? RANK_ORDER.indexOf(b.rank) : -1;
  const rankDiff = (ai === -1 ? RANK_ORDER.length : ai) - (bi === -1 ? RANK_ORDER.length : bi);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name, "ko");
}

export function MeetingCreateForm({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const minStartDate = useMemo(() => addBusinessDays(new Date(), 3), []);

  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, AssignableRole | null>>({});
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [agendaDate, setAgendaDate] = useState<Date | null>(null);
  const [agendaHour, setAgendaHour] = useState(18);
  const [agendaMinute, setAgendaMinute] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const byDepartment = useMemo(() => {
    const map = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const dept = c.department ?? "부서 미지정";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(c);
    }
    Array.from(map.values()).forEach((users) => users.sort(compareByRankThenName));
    return map;
  }, [candidates]);

  const modalDepartments = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return Array.from(byDepartment.entries());
    return Array.from(byDepartment.entries())
      .map(([dept, users]) => [dept, users.filter((c) => c.name.toLowerCase().includes(q))] as [string, Candidate[]])
      .filter(([, users]) => users.length > 0);
  }, [byDepartment, modalSearch]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(q) || (c.department ?? "").toLowerCase().includes(q));
  }, [search, candidates]);

  const selectedIds = Object.keys(selected);
  const totalDurationMinutes = durationHours * 60 + durationMinutes;

  function addCandidate(c: Candidate) {
    setSelected((prev) => ({ ...prev, [c.id]: prev[c.id] ?? null }));
    setSearch("");
  }
  function removeCandidate(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function setRole(id: string, role: AssignableRole) {
    setSelected((prev) => ({ ...prev, [id]: role }));
  }

  const allRolesAssigned = selectedIds.length > 0 && selectedIds.every((id) => selected[id] !== null);
  const agendaDeadline = agendaDate ? new Date(agendaDate.getFullYear(), agendaDate.getMonth(), agendaDate.getDate(), agendaHour, agendaMinute) : null;
  const canSubmit =
    title.trim().length > 0 &&
    allRolesAssigned &&
    range.start &&
    range.end &&
    totalDurationMinutes > 0 &&
    totalDurationMinutes <= 480 &&
    agendaDeadline;

  function handleConfirmCreate() {
    if (!range.start || !range.end || !agendaDeadline) return;
    setError(null);
    setIsPending(true);
    (async () => {
      const result = await createMeeting({
        title: title.trim(),
        participants: selectedIds.map((id) => ({ userId: id, role: selected[id] as AssignableRole })),
        candidateStartDate: range.start!,
        candidateEndDate: range.end!,
        durationMinutes: totalDurationMinutes,
        agendaDeadline,
      });
      setIsPending(false);
      setConfirmOpen(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/meetings/${result.data.meetingId}/dashboard`);
    })();
  }

  return (
    <div>
      <div className="section">
        <div className="section-label">회의 제목</div>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 3분기 로드맵 논의" />
      </div>

      <div className="section">
        <div className="section-label">참석자</div>
        <div className="picker-row">
          <div className="search-wrap">
            <input className="field" style={{ marginBottom: 0 }} placeholder="이름으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            {searchResults.length > 0 && (
              <div className="suggestion-list">
                {searchResults.map((c) => (
                  <button key={c.id} type="button" className="suggestion-item" onClick={() => addCandidate(c)}>
                    <Avatar name={c.name} profileImageUrl={c.profileImageUrl} size="sm" />
                    <div>
                      <div className="suggestion-name">{c.name}</div>
                      <div className="suggestion-dept">
                        {c.department} {c.rank}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="org-icon-btn"
            title="부서 조직도에서 찾기"
            onClick={() => {
              setModalSearch("");
              setShowOrgModal(true);
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="4" rx="0.5" />
              <rect x="3" y="16" width="6" height="4" rx="0.5" />
              <rect x="15" y="16" width="6" height="4" rx="0.5" />
              <path d="M12 7v4M6 16v-3h12v3" />
            </svg>
          </button>
        </div>
        <div className="participant-list-header">추가된 참석자 ({selectedIds.length}명)</div>
        {selectedIds.map((id) => {
          const c = candidates.find((cand) => cand.id === id)!;
          return (
            <div key={id} className="participant-row">
              <Avatar name={c.name} profileImageUrl={c.profileImageUrl} size="sm" />
              <div className="participant-info">
                <div className="participant-name">{c.name}</div>
                <div className="participant-dept">{c.department}</div>
              </div>
              <div className={`role-toggle${selected[id] === null ? " pending" : ""}`}>
                {(["필수", "선택"] as AssignableRole[]).map((role) => (
                  <button key={role} type="button" className={selected[id] === role ? "active" : ""} onClick={() => setRole(id, role)}>
                    {role}
                  </button>
                ))}
              </div>
              <button type="button" className="remove-btn" onClick={() => removeCandidate(id)} aria-label="제거">
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="section">
        <div className="section-label">회의 후보 기간</div>
        <CalendarPicker mode="range" minDate={minStartDate} value={range} onChangeRange={setRange} />
        {(range.start || range.end) && (
          <button type="button" className="calendar-reset-link" onClick={() => setRange({ start: null, end: null })}>
            선택 초기화
          </button>
        )}
        {range.start && (
          <div className="period-preview-box">
            <div className="period-row">
              <span style={{ color: "var(--muted)" }}>시작일</span>
              <span style={{ fontWeight: 700 }}>{formatAbsoluteDate(range.start)}</span>
            </div>
            {range.end && (
              <div className="period-row">
                <span style={{ color: "var(--muted)" }}>종료일</span>
                <span style={{ fontWeight: 700 }}>{formatAbsoluteDate(range.end)}</span>
              </div>
            )}
          </div>
        )}
        <div className="hint" style={{ marginTop: 8 }}>
          시작일은 오늘로부터 최소 3영업일 이후만 선택할 수 있어요. 저장 시 이 기간에 30분 단위로 후보 슬롯이 만들어져요.
        </div>
      </div>

      <div className="section">
        <div className="section-label">예상 회의 시간</div>
        <div className="duration-input-row">
          <input
            type="number"
            className="duration-number"
            min={0}
            max={8}
            value={durationHours}
            onChange={(e) => setDurationHours(Math.max(0, Math.min(8, Number(e.target.value))))}
          />
          <span className="duration-unit">시간</span>
          <input
            type="number"
            className="duration-number"
            min={0}
            max={55}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(0, Math.min(55, Math.round(Number(e.target.value) / 5) * 5)))}
          />
          <span className="duration-unit">분</span>
        </div>
        {totalDurationMinutes > 480 && <div className="field-error">최대 8시간까지 설정할 수 있어요.</div>}
        <div className="hint" style={{ marginTop: 8 }}>
          주최자가 예상 회의 시간을 직접 입력해요. 입력한 시간만큼 각 후보 슬롯의 회의 길이가 정해져요.
        </div>
      </div>

      <div className="section">
        <div className="section-label">안건 마감</div>
        <CalendarPicker mode="single" minDate={new Date()} value={agendaDate} onChangeSingle={setAgendaDate} />
        <div className="time-select-row">
          <span className="time-select-label">시간 선택</span>
          <span className="time-select-inputs">
            <select className="time-select" value={agendaHour} onChange={(e) => setAgendaHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span className="time-colon">:</span>
            <select className="time-select" value={agendaMinute} onChange={(e) => setAgendaMinute(Number(e.target.value))}>
              {[0, 10, 20, 30, 40, 50].map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          참석자 전원이 이 시점까지 안건을 등록할 수 있어요. 마감이 지나도 진행에는 영향 없고, 주최자에게만 리마인드가 발송돼요.
        </div>
      </div>

      {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

      <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
        회의 만들기
      </button>
      {!canSubmit && selectedIds.length === 0 && <div className="hint" style={{ color: "var(--accent-red)", marginTop: 6 }}>참석자를 1명 이상 추가해 주세요.</div>}

      {showOrgModal && (
        <div className="org-modal">
          <div className="org-modal-header">
            <span className="org-modal-title">부서에서 찾기</span>
            <button type="button" className="org-modal-close" onClick={() => setShowOrgModal(false)} aria-label="닫기">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="org-modal-search">
            <div className="search-input-wrap">
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </span>
              <input className="search-input" placeholder="이름으로 검색" value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} />
            </div>
          </div>
          <div className="org-modal-body">
            {modalDepartments.length === 0 && <div className="hint" style={{ padding: "16px 2px" }}>검색 결과가 없어요.</div>}
            {modalDepartments.map(([dept, users]) => {
              const isExpanded = modalSearch.trim() ? true : expandedDept === dept;
              return (
                <div key={dept} className="org-dept">
                  <button type="button" className="org-dept-header" onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}>
                    <span style={{ fontSize: 13, color: "var(--muted)", transform: isExpanded ? "rotate(90deg)" : "none", display: "inline-block" }}>
                      ›
                    </span>
                    <span className="dept-name">{dept}</span>
                    <span className="dept-count">{users.length}명</span>
                  </button>
                  {isExpanded && (
                    <div>
                      {users.map((c) => {
                        const added = selected[c.id] !== undefined;
                        return (
                          <div key={c.id} className="org-member">
                            <Avatar name={c.name} profileImageUrl={c.profileImageUrl} size="sm" />
                            <div className="member-info">
                              <div className="member-name">{c.name}</div>
                              <div className="member-role">
                                {c.rank} {c.position}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`add-btn${added ? " added" : ""}`}
                              disabled={added}
                              onClick={() => addCandidate(c)}
                            >
                              {added ? "✓" : "+"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="org-modal-footer">
            <button type="button" className="btn btn-primary" onClick={() => setShowOrgModal(false)}>
              저장 ({selectedIds.length}명 선택됨)
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="회의를 만들까요?"
        message={`제목: ${title}\n참석자 ${selectedIds.length + 1}명(나 포함)\n후보 기간: ${range.start ? formatAbsoluteDate(range.start) : ""} ~ ${range.end ? formatAbsoluteDate(range.end) : ""}\n\n참석자 전원에게 알림이 발송됩니다.`}
        pending={isPending}
        onConfirm={handleConfirmCreate}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
