"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertSlotResponse, submitResponseComplete } from "@/server/actions/slots";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";
import type { SlotResponseStatus } from "@/lib/enums";

type Slot = { id: string; startTime: Date; endTime: Date; myStatus: SlotResponseStatus | null };

export function ShortlistClient(props: {
  meetingId: string;
  meetingTitle: string;
  optionalResponseDeadline: Date;
  isEditable: boolean;
  slots: Slot[];
  computedMode: "온라인" | "오프라인" | "하이브리드" | null;
  alreadyResponded: boolean;
  userName: string;
  userDepartment: string | null;
  userRank: string | null;
  userProfileImageUrl: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, SlotResponseStatus | null>>(
    Object.fromEntries(props.slots.map((s) => [s.id, s.myStatus]))
  );
  const [responded, setResponded] = useState(props.alreadyResponded);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handlePick(slotId: string, status: SlotResponseStatus) {
    if (!props.isEditable) return;
    setStatuses((prev) => ({ ...prev, [slotId]: status }));
    await upsertSlotResponse(props.meetingId, slotId, status);
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

  const allAnswered = props.slots.every((s) => statuses[s.id]);
  const deadlineLabel = props.optionalResponseDeadline.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="선택 응답"
        attendee={{
          userName: props.userName,
          userProfileImageUrl: props.userProfileImageUrl,
          userDepartment: props.userDepartment,
          userRank: props.userRank,
          roleBadge: "선택 참석자",
        }}
      />
      <div style={{ padding: "10px 16px 0", fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{props.meetingTitle}</div>

      {props.computedMode && (
        <div className="mode-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.8" />
            <path d="M4.5 20c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" />
          </svg>
          <span>
            계산된 회의 형태: <span className="mode-value">{props.computedMode}</span>
          </span>
          <span className="mode-caption">필수 참석자 기준으로 이미 정해졌어요</span>
        </div>
      )}

      <div className="meta-row">
        <span>선택 응답 마감(상한)</span>
        <span className="deadline">{deadlineLabel}</span>
      </div>
      <div className="instruction">압축된 후보 시간 중 참석 가능한 시간을 골라주세요.</div>
      <div className="privacy-note">
        응답 내용은 개별 공개되지 않고, 집계 결과만 전달돼요. 단, 일정 조율이 어려운 경우 시스템이 필요한 분께만 개별로 변경 요청을 보낼 수 있어요.
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {props.slots.map((s) => {
          const status = statuses[s.id];
          return (
            <div key={s.id} className="candidate-card">
              <div>
                <div className="candidate-datetime">{formatTimeRange(s.startTime, s.endTime)}</div>
                <div className="candidate-date-sub">{formatMeetingDate(s.startTime)}</div>
              </div>
              <div className="candidate-choice">
                {(["가능", "불가"] as SlotResponseStatus[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={!props.isEditable}
                    className={status === opt ? (opt === "가능" ? "active-available" : "active-unavailable") : ""}
                    onClick={() => handlePick(s.id, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="footer">
        {responded && <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>✓ 응답 완료됨</div>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!props.isEditable || !allAnswered}
          onClick={() => setConfirmOpen(true)}
        >
          응답 완료
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="응답을 완료하시겠습니까?"
        message="선택한 내용으로 응답을 제출합니다."
        pending={isPending}
        onConfirm={handleComplete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
