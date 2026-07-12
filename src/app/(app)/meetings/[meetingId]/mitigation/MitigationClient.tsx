"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToMitigationAction } from "@/server/actions/mitigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader, type SubHeaderAttendee } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";

export function MitigationClient(props: {
  meetingId: string;
  meetingTitle: string;
  mitigationRequestId: string;
  slotLabel: string;
  myConstraintStatus: "불가" | "기피";
  attendee: SubHeaderAttendee;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<"agree" | "decline" | null>(null);

  function respond(decision: "수락" | "유지") {
    setIsPending(true);
    (async () => {
      const res = await respondToMitigationAction(props.mitigationRequestId, decision);
      setIsPending(false);
      setConfirmOpen(false);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      setResult(decision === "수락" ? "agree" : "decline");
      router.refresh();
    })();
  }

  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <SubHeader title="변경요청" backHref="/meetings" attendee={props.attendee} />
        <div className="result-wrap">
          <div className={`result-icon ${result}`}>
            {result === "agree" ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            )}
          </div>
          <div className="result-title">{result === "agree" ? "가능으로 변경했어요" : "불가로 유지했어요"}</div>
          <div className="result-body">응답이 반영됐어요. 결과는 회의 목록에서 확인할 수 있어요.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader title="변경요청" backHref="/meetings" attendee={props.attendee} />
      <div className="screen-scroll">
        <div className="alert-box">
          <div className="alert-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            변경요청이 도착했어요
          </div>
          <div className="alert-body">{props.meetingTitle} 일정 조율을 위해 회원님의 응답 변경이 필요해요.</div>
        </div>

        <div className="slot-card">
          <div className="slot-card-label">문제가 되는 후보 시간</div>
          <div className="slot-card-time">{props.slotLabel}</div>
          <div className="my-response-row">
            <span>내 응답</span>
            <span className="my-response-tag">{props.myConstraintStatus}</span>
          </div>
        </div>

        <div className="impact-note">
          다른 참석자들은 이 시간에 대부분 가능하지만, 회원님의 응답 때문에 확정이 어려워요. 혹시 <strong>가능</strong>으로 변경해주실 수 있을까요?
        </div>
      </div>

      <div className="footer-split">
        <button type="button" className="footer-btn secondary" disabled={isPending} onClick={() => respond("유지")}>
          불가로 유지
        </button>
        <button type="button" className="footer-btn primary" disabled={isPending} onClick={() => setConfirmOpen(true)}>
          가능으로 변경
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="가능으로 변경할까요?"
        message="이 시간에 참석 가능한 것으로 응답이 변경돼요."
        pending={isPending}
        onConfirm={() => respond("수락")}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
