"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forceConfirmSlot, forceNextStageAction } from "@/server/actions/meetings";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";

type Participant = {
  userId: string;
  name: string;
  role: "필수" | "선택" | "주최자";
  respondedAt: Date | null;
  confirmationStatus: "미확인" | "확정" | "불참";
};
type RankingRow = { timeSlotId: string; startTime: Date; endTime: Date; hardPass: boolean; unavailCount: number };
type ShortlistedSlot = { id: string; startTime: Date; endTime: Date; optionalAvailable: number; optionalDeclined: number };

const STEPS: { key: string; label: string }[] = [
  { key: "필수응답중", label: "필수응답" },
  { key: "선택확인중", label: "선택확인" },
  { key: "확정", label: "확정" },
];

export function DashboardClient(props: {
  meetingId: string;
  title: string;
  status: "제안중" | "확정" | "재조율중" | "취소";
  stage: "필수응답중" | "선택확인중" | "확정";
  mode: "온라인" | "오프라인" | "하이브리드" | null;
  participants: Participant[];
  rankingRows: RankingRow[];
  shortlistedSlots: ShortlistedSlot[];
  confirmedStartTime: Date | null;
  confirmedEndTime: Date | null;
  roomName: string | null;
  videoLink: string | null;
  rescheduleCount: number;
  rescheduleCapReached: boolean;
  pendingMitigation: { targetName: string; startTime: Date } | null;
  exhaustedMitigation: boolean;
  userName: string;
  userProfileImageUrl: string | null;
  userDepartment: string | null;
  userRank: string | null;
  userPosition: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmKind, setConfirmKind] = useState<"confirmSlot" | "nextStage" | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredParticipants = props.participants.filter((p) => p.role === "필수" || p.role === "주최자");
  const optionalParticipants = props.participants.filter((p) => p.role === "선택");
  const bestSlot = props.rankingRows.find((r) => r.hardPass);
  const maxUnavail = Math.max(1, ...props.rankingRows.map((r) => r.unavailCount));
  const currentStepIndex = STEPS.findIndex((s) => s.key === props.stage);
  const organizer = props.participants.find((p) => p.role === "주최자");

  function runAction(kind: "confirmSlot" | "nextStage") {
    setIsPending(true);
    (async () => {
      const result = kind === "confirmSlot" ? await forceConfirmSlot(props.meetingId) : await forceNextStageAction(props.meetingId);
      setIsPending(false);
      setConfirmKind(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast("처리됐어요");
      router.refresh();
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="회의 대시보드"
        backHref="/meetings"
        attendee={{
          userName: props.userName,
          userProfileImageUrl: props.userProfileImageUrl,
          userDepartment: props.userDepartment,
          userRank: props.userRank,
          userPosition: props.userPosition,
          roleBadge: "주최자",
        }}
      />

      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <span className="role-badge">{props.status === "제안중" ? props.stage : props.status}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{props.title}</div>
      </div>

      {props.status !== "취소" && (
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s.key} className={i < currentStepIndex || props.status === "확정" ? "step done" : i === currentStepIndex ? "step current" : "step"}>
              <div className="step-dot">{i < currentStepIndex || (props.status === "확정" && i <= currentStepIndex) ? "✓" : i + 1}</div>
              <div className="step-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="screen-scroll">
        {props.stage === "필수응답중" && organizer && !organizer.respondedAt && (
          <Link
            href={`/meetings/${props.meetingId}/respond`}
            className="btn btn-primary"
            style={{ display: "block", textAlign: "center", marginBottom: 14 }}
          >
            내 참석 가능 시간 응답하기
          </Link>
        )}

        {props.status === "확정" && props.confirmedStartTime && props.confirmedEndTime && (
          <div className="confirmed-banner">
            <div className="confirmed-banner-label">확정된 시간</div>
            <div className="confirmed-banner-time">
              {formatMeetingDate(props.confirmedStartTime)} {formatTimeRange(props.confirmedStartTime, props.confirmedEndTime)}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-title">참가자 응답 현황</div>
          <div className="role-group-label">필수 참석자</div>
          {requiredParticipants.map((p) => (
            <div key={p.userId} className="dash-participant-row">
              <span>{p.name}</span>
              <span className={`resp-chip ${p.respondedAt ? "done" : "pending"}`}>{p.respondedAt ? "응답완료" : "미응답"}</span>
            </div>
          ))}
          {optionalParticipants.length > 0 && (
            <>
              <div className="role-group-label">선택 참석자</div>
              {optionalParticipants.map((p) => (
                <div key={p.userId} className="dash-participant-row">
                  <span>{p.name}</span>
                  <span className={`resp-chip ${p.confirmationStatus === "불참" ? "pending" : p.respondedAt ? "done" : "pending"}`}>
                    {p.confirmationStatus === "불참" ? "불참" : p.respondedAt ? "응답완료" : "미응답"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {props.stage === "필수응답중" && props.rankingRows.length > 0 && (
          <div className="section">
            <div className="section-title">
              후보 시간 순위<span className="section-sub">불편도 낮은 순</span>
            </div>
            {props.rankingRows.map((r, i) => (
              <div key={r.timeSlotId} className={`candidate-row${i === 0 && r.hardPass ? " top" : ""}`}>
                <div className="candidate-top-line">
                  <span className="candidate-time">
                    {formatMeetingDate(r.startTime)} {formatTimeRange(r.startTime, r.endTime)}
                    {i === 0 && r.hardPass && <span className="top-pick-tag">추천</span>}
                  </span>
                  {r.hardPass ? <span className="hard-pass">✓ 통과</span> : <span className="hard-fail">✕ 제약</span>}
                </div>
                <div className="score-bar-wrap">
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${100 - (r.unavailCount / maxUnavail) * 100}%` }} />
                  </div>
                  <span className="score-num">불편도 {r.unavailCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {props.stage === "선택확인중" && props.shortlistedSlots.length > 0 && (
          <div className="section">
            <div className="section-title">압축 후보(5개) · 선택 참석자 응답</div>
            {props.shortlistedSlots.map((s) => (
              <div key={s.id} className="candidate-row">
                <div className="candidate-top-line">
                  <span className="candidate-time">
                    {formatMeetingDate(s.startTime)} {formatTimeRange(s.startTime, s.endTime)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  가능 {s.optionalAvailable} · 불가 {s.optionalDeclined}
                </div>
              </div>
            ))}
          </div>
        )}

        {props.mode && (
          <div className="section">
            <div className="section-title">계산된 회의 형태</div>
            <div className="muted-box" style={{ color: "var(--ink)", fontWeight: 700 }}>{props.mode}</div>
          </div>
        )}

        {props.status === "확정" && (
          <div className="section">
            <div className="section-title">확정 결과(승인 대기)</div>
            <div className="candidate-row top">
              {props.roomName && <div style={{ fontSize: 12.5, marginBottom: 4 }}>회의실: {props.roomName}</div>}
              {props.videoLink && <div style={{ fontSize: 12.5 }}>화상링크: {props.videoLink}</div>}
              {!props.roomName && !props.videoLink && <div style={{ fontSize: 12.5, color: "var(--accent-red)" }}>자동 매칭된 회의실/링크가 없어요. 수동 조정이 필요해요.</div>}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-title">재조율 횟수</div>
          <div className="muted-box">{props.rescheduleCount} / 3 (자동 1회 + 수동 2회)</div>
          {props.rescheduleCapReached && (
            <div style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 6 }}>재조율 한도에 도달했어요. 담당자에게 문의해주세요.</div>
          )}
        </div>

        {props.pendingMitigation && (
          <div className="mitigation-box">
            변경요청 진행 중 — {props.pendingMitigation.targetName}님에게 {formatMeetingDate(props.pendingMitigation.startTime)} 시간에 대한 변경요청을 보냈어요.
          </div>
        )}

        {props.exhaustedMitigation && (
          <Link href={`/meetings/${props.meetingId}/adjust`} className="btn btn-secondary" style={{ display: "block", textAlign: "center", marginBottom: 10 }}>
            수동 조정으로 이동
          </Link>
        )}

        {error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}

        {props.status === "제안중" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {props.stage === "선택확인중" && bestSlot && (
              <button type="button" className="btn btn-primary" onClick={() => setConfirmKind("confirmSlot")}>
                이 시간으로 확정
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmKind("nextStage")}>
              다음 단계로 강제 진행
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmKind === "confirmSlot"}
        title="이 시간으로 확정할까요?"
        message="확정하면 참석자에게 알림이 발송되고, 필요 시 회의실/화상링크가 자동으로 매칭돼요."
        pending={isPending}
        onConfirm={() => runAction("confirmSlot")}
        onCancel={() => setConfirmKind(null)}
      />
      <ConfirmDialog
        open={confirmKind === "nextStage"}
        title="다음 단계로 강제 진행할까요?"
        message="응답하지 않은 참석자가 있어도 즉시 다음 단계로 넘어가요."
        pending={isPending}
        onConfirm={() => runAction("nextStage")}
        onCancel={() => setConfirmKind(null)}
      />
    </div>
  );
}
