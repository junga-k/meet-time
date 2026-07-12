"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertSlotResponse, submitResponseComplete } from "@/server/actions/slots";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";
import type { SlotResponseStatus } from "@/lib/enums";

type Slot = { id: string; startTime: Date; endTime: Date; myStatus: SlotResponseStatus };

const CYCLE: SlotResponseStatus[] = ["가능", "기피", "불가"];
const CELL_LABEL: Record<SlotResponseStatus, string> = { 가능: "✓", 기피: "△", 불가: "✕" };
const CELL_CLASS: Record<SlotResponseStatus, string> = { 가능: "available", 기피: "avoid", 불가: "unavailable" };

function timeOfDay(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function RespondClient(props: {
  meetingId: string;
  meetingTitle: string;
  requiredResponseDeadline: Date;
  isEditable: boolean;
  slots: Slot[];
  alreadyResponded: boolean;
  userName: string;
  userDepartment: string | null;
  userRank: string | null;
  userProfileImageUrl: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, SlotResponseStatus>>(
    Object.fromEntries(props.slots.map((s) => [s.id, s.myStatus]))
  );
  const [responded, setResponded] = useState(props.alreadyResponded);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { dates, times, grid } = useMemo(() => {
    const dateSet = new Map<string, Date>();
    const timeSet = new Set<string>();
    const g = new Map<string, Slot>();
    for (const s of props.slots) {
      dateSet.set(dayKey(s.startTime), s.startTime);
      timeSet.add(timeOfDay(s.startTime));
      g.set(`${dayKey(s.startTime)}_${timeOfDay(s.startTime)}`, s);
    }
    const dates = Array.from(dateSet.values()).sort((a, b) => a.getTime() - b.getTime());
    const times = Array.from(timeSet.values()).sort();
    return { dates, times, grid: g };
  }, [props.slots]);

  async function handleCellClick(slot: Slot) {
    if (!props.isEditable) return;
    const current = statuses[slot.id];
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setStatuses((prev) => ({ ...prev, [slot.id]: next }));
    const result = await upsertSlotResponse(props.meetingId, slot.id, next);
    if (result.ok) showToast("✓ 저장됨");
  }

  function handleComplete() {
    setIsPending(true);
    (async () => {
      const result = await submitResponseComplete(props.meetingId);
      setIsPending(false);
      setConfirmOpen(false);
      if (result.ok) {
        setResponded(true);
        showToast("✓ 응답 완료");
        router.refresh();
      }
    })();
  }

  const deadlineLabel = props.requiredResponseDeadline.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="응답"
        backHref="/meetings"
        attendee={{
          userName: props.userName,
          userProfileImageUrl: props.userProfileImageUrl,
          userDepartment: props.userDepartment,
          userRank: props.userRank,
          roleBadge: "필수",
        }}
      />
      <div style={{ padding: "10px 16px 0", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{props.meetingTitle}</div>

      <div className="meta-row">
        <span>필수 응답 마감(상한)</span>
        <span className="deadline">{deadlineLabel}</span>
      </div>
      <div className="instruction">
        모든 시간은 기본 <strong>가능(✓)</strong>이에요. 참석이 어려운 시간을 클릭해 <strong>기피(△) → 불가(✕)</strong>로 표시해 주세요.
      </div>

      {!props.isEditable && (
        <div style={{ padding: "8px 16px", background: "var(--accent-amber-bg)", fontSize: 12, color: "var(--accent-amber)" }}>
          이미 다음 단계로 진행돼서 더 이상 수정할 수 없어요.
        </div>
      )}

      <div className="legend">
        <div className="legend-item">
          <span className="swatch available">✓</span>가능
        </div>
        <div className="legend-item">
          <span className="swatch avoid" />기피
        </div>
        <div className="legend-item">
          <span className="swatch unavailable" />불가
        </div>
      </div>

      <div className="grid-wrap">
        <div className="grid-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                {dates.map((d) => (
                  <th key={dayKey(d)}>
                    {d.getMonth() + 1}/{d.getDate()}
                    <span className="day-date">{WEEKDAY[d.getDay()]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => (
                <tr key={t}>
                  <td className="time-label">{t}</td>
                  {dates.map((d) => {
                    const slot = grid.get(`${dayKey(d)}_${t}`);
                    if (!slot) return <td key={dayKey(d) + t} />;
                    const status = statuses[slot.id];
                    return (
                      <td key={slot.id} style={{ padding: 0 }}>
                        <button
                          type="button"
                          className={`slot-cell ${CELL_CLASS[status]}`}
                          style={{ width: "100%" }}
                          disabled={!props.isEditable}
                          onClick={() => handleCellClick(slot)}
                        >
                          {CELL_LABEL[status]}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer">
        <div className="warning-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0, color: "var(--muted)" }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          확정 후엔 일정 변경이 어려워요 · 제출하신 일정은 시스템이 자동으로 조율해요
        </div>
        {responded && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>✓ 응답 완료됨 · 마감 전까지 슬롯을 계속 수정할 수 있어요</div>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!props.isEditable}
          onClick={() => setConfirmOpen(true)}
        >
          응답 완료
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="응답을 완료하시겠습니까?"
        message={"이후 변경은 가능하지만, 회의가 이미 확정된 뒤에는 다른 참석자에게 영향을 줄 수 있습니다.\n미표시 슬롯은 가능 처리됩니다."}
        pending={isPending}
        onConfirm={handleComplete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
