"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  reconfirmOnlineAction,
  reconfirmOfflineAction,
  reconfirmAction,
  setDelegateAction,
  declineWithReasonAction,
} from "@/server/actions/participants";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";

type OtherUser = { id: string; name: string; department: string | null };

export function ReconfirmClient(props: {
  meetingId: string;
  meetingTitle: string;
  slotLabel: string;
  roomName: string | null;
  videoLink: string | null;
  myAttendanceMode: "대면" | "온라인" | "무관" | null;
  myRole: "필수" | "선택" | "주최자";
  alreadyReconfirmed: boolean;
  otherUsers: OtherUser[];
  userName: string;
  userProfileImageUrl: string | null;
  userDepartment: string | null;
  userRank: string | null;
  userPosition: string | null;
}) {
  const attendee = {
    userName: props.userName,
    userProfileImageUrl: props.userProfileImageUrl,
    userDepartment: props.userDepartment,
    userRank: props.userRank,
    userPosition: props.userPosition,
    roleBadge: props.myRole,
  };
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"idle" | "modeChange" | "declineCheck" | "delegate" | "decline">("idle");
  const [delegateId, setDelegateId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ title: string; desc: string; warn: boolean } | null>(null);

  function handleSetAttendanceMode(attendanceMode: "대면" | "온라인") {
    setIsPending(true);
    (async () => {
      const action = attendanceMode === "온라인" ? reconfirmOnlineAction : reconfirmOfflineAction;
      const result = await action(props.meetingId);
      setIsPending(false);
      if (result.ok) {
        showToast("참석 형태가 변경됐어요");
        router.push(`/meetings/${props.meetingId}`);
      }
    })();
  }

  function handleConfirm() {
    setIsPending(true);
    (async () => {
      const result = await reconfirmAction(props.meetingId);
      setIsPending(false);
      if (result.ok) {
        showToast("참석이 확정됐어요");
        router.push(`/meetings/${props.meetingId}`);
      }
    })();
  }

  function handleDelegateSubmit() {
    if (!delegateId) return;
    setIsPending(true);
    (async () => {
      const result = await setDelegateAction(props.meetingId, delegateId);
      setIsPending(false);
      if (result.ok) {
        showToast("대리 참석자가 지정됐어요");
        router.push(`/meetings/${props.meetingId}`);
      }
    })();
  }

  function handleDeclineSubmit() {
    if (!declineReason.trim()) return;
    setIsPending(true);
    (async () => {
      const result = await declineWithReasonAction(props.meetingId, { reason: declineReason.trim() });
      setIsPending(false);
      if (!result.ok) return;
      if (props.myRole === "선택") {
        setResultMessage({ title: "불참이 접수됐어요", desc: "회의 시작부터 회의록을 확인해주세요.", warn: false });
      } else if (result.data.escalated) {
        setResultMessage({ title: "불참이 접수됐어요", desc: "재조율 한도에 도달해 담당자에게 에스컬레이션됐어요.", warn: true });
      } else {
        setResultMessage({ title: "불참이 접수됐어요", desc: "다른 시간으로 재조율을 시작합니다.", warn: true });
      }
    })();
  }

  if (resultMessage) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <SubHeader title="참석 재확인" attendee={attendee} />
        <div style={{ padding: 16 }}>
          <div className={`result-box${resultMessage.warn ? " warn" : ""}`}>
            <div className="result-title">{resultMessage.title}</div>
            <div className="result-desc">{resultMessage.desc}</div>
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => router.push("/meetings")}>
            회의 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader title="참석 재확인" attendee={attendee} />

      <div className="screen-scroll">
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{props.meetingTitle}</div>

        {props.alreadyReconfirmed && <div className="hint" style={{ marginBottom: 12 }}>이미 재확인을 완료했어요. 아래에서 변경할 수 있어요.</div>}

        <div className="section">
          <div className="info-box">
            <div className="info-box-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M3.5 9.5h17M8 3v4M16 3v4" />
              </svg>
              <div>
                <div className="info-box-main">{props.slotLabel}</div>
                {props.roomName && <div className="info-box-sub">장소: {props.roomName}</div>}
                {props.videoLink && <div className="info-box-sub">화상링크: {props.videoLink}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="mode-box">
            이전에 선택한 참석 형태: <span className="mode-value">{props.myAttendanceMode ?? "무관"}</span>
          </div>
        </div>

        {mode === "modeChange" && (
          <div className="section">
            <div className="section-title">참석 형태 선택</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" className="btn" disabled={isPending} onClick={() => handleSetAttendanceMode("대면")}>
                대면으로 참석
              </button>
              <button type="button" className="btn" disabled={isPending} onClick={() => handleSetAttendanceMode("온라인")}>
                온라인으로 참석
              </button>
              <button type="button" className="btn btn-danger" disabled={isPending} onClick={() => setMode("declineCheck")}>
                불참
              </button>
            </div>
            <button type="button" className="footer-link" disabled={isPending} onClick={() => setMode("idle")} style={{ display: "block", margin: "10px auto 0" }}>
              취소
            </button>
          </div>
        )}

        {mode === "declineCheck" && (
          <div className="section">
            <div className="change-notice">
              <div className="change-notice-title">잠깐, 확인해주세요</div>
              이 시간에 온라인으로는 참석 가능하신가요? 온라인 참석도 어려운 경우에만 불참으로 처리해주세요.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setMode("decline")}>
                아니오, 불참 처리
              </button>
              <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => handleSetAttendanceMode("온라인")}>
                네, 온라인으로 참석
              </button>
            </div>
            <button type="button" className="footer-link" disabled={isPending} onClick={() => setMode("modeChange")} style={{ display: "block", margin: "10px auto 0" }}>
              취소
            </button>
          </div>
        )}

        {mode === "delegate" && (
          <div className="section">
            <div className="section-title">대리 참석자 선택</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
              {props.otherUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setDelegateId(u.id)}
                  className="btn"
                  style={{
                    padding: "8px 10px",
                    fontSize: 12.5,
                    textAlign: "left",
                    background: delegateId === u.id ? "var(--ink)" : "#fff",
                    color: delegateId === u.id ? "#fff" : "var(--ink)",
                  }}
                >
                  {u.name} · {u.department}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setMode("idle")}>
                취소
              </button>
              <button type="button" className="btn btn-primary" disabled={!delegateId || isPending} onClick={handleDelegateSubmit}>
                지정 완료
              </button>
            </div>
          </div>
        )}

        {mode === "decline" && (
          <div className="section">
            {props.myRole !== "선택" && (
              <div className="change-notice">
                <div className="change-notice-title">참고해주세요</div>
                다른 참석자들이 이미 이 일정에 맞춰 계획을 세웠을 수 있습니다. 재조율이 발생하면 일정이 빠듯해질 수 있어요.
              </div>
            )}
            <div className="field-group">
              <label className="field-label">불참 사유 (필수)</label>
              <textarea className="field" rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setMode("idle")}>
                취소
              </button>
              <button type="button" className="btn btn-danger" disabled={!declineReason.trim() || isPending} onClick={handleDeclineSubmit}>
                불참 제출
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === "idle" && (
        <div className="footer" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setMode("modeChange")}>
              참석 형태 변경
            </button>
            <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleConfirm}>
              참석 확정
            </button>
          </div>
          <button type="button" className="footer-link" disabled={isPending} onClick={() => setMode("delegate")} style={{ alignSelf: "center", marginTop: 2 }}>
            대리 참석자 지정
          </button>
        </div>
      )}
    </div>
  );
}
