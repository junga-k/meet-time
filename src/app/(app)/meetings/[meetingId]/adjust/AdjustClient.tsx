"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeParticipantRoleAction,
  extendCandidateRangeAction,
  changeRoomBookingAction,
  setModeOnlineAction,
} from "@/server/actions/adjustment";
import { forceConfirmSlotIgnoringConstraints } from "@/server/actions/meetings";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";

type Participant = { id: string; name: string; role: "필수" | "선택" };
type MitigationHistoryRow = { seq: number; targetName: string; slotLabel: string; status: "대기" | "수락" | "유지" };
type RoomRow = { id: string; name: string; capacity: number | null; available: boolean };

export function AdjustClient(props: {
  meetingId: string;
  meetingTitle: string;
  rescheduleCount: number;
  rescheduleCapReached: boolean;
  hasConfirmedSlot: boolean;
  participants: Participant[];
  mitigationHistory: MitigationHistoryRow[];
  rooms: RoomRow[];
  userName: string;
  userProfileImageUrl: string | null;
  userDepartment: string | null;
  userRank: string | null;
  userPosition: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<null | { kind: "forceConfirm" | "extend" | "online" }>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setIsPending(true);
    (async () => {
      const result = await action();
      setIsPending(false);
      setConfirmAction(null);
      if (!result.ok) {
        setError(result.error ?? "처리 중 오류가 발생했어요.");
        return;
      }
      showToast("처리됐어요");
      router.refresh();
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="수동 조정"
        backHref={`/meetings/${props.meetingId}/dashboard`}
        attendee={{
          userName: props.userName,
          userProfileImageUrl: props.userProfileImageUrl,
          userDepartment: props.userDepartment,
          userRank: props.userRank,
          userPosition: props.userPosition,
          roleBadge: "주최자",
        }}
      />

      <div className="screen-scroll">
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{props.meetingTitle}</div>

        <div className="reason-box">
          <div className="reason-box-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            자동화가 실패해서 직접 조정이 필요해요
          </div>
          재조율 {props.rescheduleCount} / 3 (자동 1회 + 수동 2회)
        </div>

        {props.mitigationHistory.length > 0 && (
          <div className="section">
            <div className="section-title">완화요청 이력</div>
            {props.mitigationHistory.map((h) => (
              <div key={h.seq} className="history-item">
                <div className="history-order">{h.seq}</div>
                <div className="history-main">
                  <div className="history-time">{h.slotLabel}</div>
                  <div className="history-detail">
                    <span className="who">{h.targetName}</span>님 —{" "}
                    {h.status === "대기" ? "응답 대기 중" : h.status === "수락" ? "가능으로 변경" : "불가로 유지"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="section">
          <div className="section-title">참석자 역할 변경</div>
          <div className="action-card">
            {props.participants.map((p) => (
              <div key={p.id} className="role-adjust-row">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span>{p.name}</span>
                  <span className={`role-tag${p.role === "선택" ? " optional" : ""}`}>{p.role}</span>
                </div>
                <button
                  type="button"
                  className="mini-btn"
                  disabled={isPending}
                  onClick={() => run(() => changeParticipantRoleAction(props.meetingId, p.id, p.role === "필수" ? "선택" : "필수"))}
                >
                  {p.role === "필수" ? "선택으로 변경" : "필수로 변경"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">후보 기간 연장</div>
          <div className="action-card">
            <div className="action-card-desc">현재 후보 기간을 7일 연장하고 새 후보 시간을 다시 검색해요.</div>
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setConfirmAction({ kind: "extend" })}>
              7일 연장 후 재검색
            </button>
          </div>
        </div>

        <div className="section">
          <div className="section-title">시간 강제 확정</div>
          <div className="action-card">
            {props.rescheduleCapReached ? (
              <div className="room-fail-box">재조율 한도(자동 1회 + 수동 2회)에 도달했어요. 담당자에게 문의해주세요.</div>
            ) : (
              <>
                <div className="action-card-desc">하드 제약을 무시하고 가장 불편도가 낮은 시간으로 즉시 확정해요.</div>
                <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => setConfirmAction({ kind: "forceConfirm" })}>
                  시간 강제 확정
                </button>
              </>
            )}
          </div>
        </div>

        {props.hasConfirmedSlot && (
          <div className="section">
            <div className="section-title">회의실 재선택</div>
            {props.rooms.map((r) => (
              <div key={r.id} className="room-option">
                <div>
                  <div className="room-option-name">{r.name}</div>
                  <div className="room-option-meta">수용 {r.capacity}명</div>
                </div>
                {r.available ? (
                  <button type="button" className="mini-btn" disabled={isPending} onClick={() => run(() => changeRoomBookingAction(props.meetingId, r.id))}>
                    선택
                  </button>
                ) : (
                  <span className="room-option-status">사용 불가</span>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setConfirmAction({ kind: "online" })} style={{ marginTop: 4 }}>
              온라인으로 전환
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction?.kind === "forceConfirm"}
        title="시간을 강제로 확정할까요?"
        message="하드 제약을 무시하고 가장 불편도가 낮은 시간으로 확정해요."
        pending={isPending}
        onConfirm={() => run(() => forceConfirmSlotIgnoringConstraints(props.meetingId))}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction?.kind === "extend"}
        title="후보 기간을 7일 연장할까요?"
        message="연장된 기간의 새 후보 시간을 다시 검색해요."
        pending={isPending}
        onConfirm={() => run(() => extendCandidateRangeAction(props.meetingId))}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction?.kind === "online"}
        title="온라인으로 전환할까요?"
        message="기존 회의실 예약은 취소되고 화상링크로 대체돼요."
        pending={isPending}
        onConfirm={() => run(() => setModeOnlineAction(props.meetingId))}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
