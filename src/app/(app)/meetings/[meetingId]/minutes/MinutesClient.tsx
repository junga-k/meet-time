"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraftNoteAction,
  registerNoteAction,
  reassignNoteAuthorAction,
  generateAiDraftAction,
} from "@/server/actions/notes";
import { createActionItemAction, toggleActionItemDoneAction, deleteActionItemAction } from "@/server/actions/actionItems";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { useToast } from "@/components/ui/Toast";
import { formatAbsoluteDate } from "@/lib/dates";

type ActionItem = { id: string; content: string; assigneeName: string | null; dueDate: Date | null; isDone: boolean };
type Person = { id: string; name: string };

export function MinutesClient(props: {
  meetingId: string;
  meetingTitle: string;
  dateLabel: string;
  participantsLabel: string;
  agendaTitles: string[];
  isOrganizer: boolean;
  isAuthor: boolean;
  authorName: string;
  noteContent: string;
  noteStatus: "임시저장" | "등록";
  isAiGenerated: boolean;
  participantsForReassign: Person[];
  actionItems: ActionItem[];
  candidateAssignees: Person[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [content, setContent] = useState(props.noteContent);
  const [status, setStatus] = useState(props.noteStatus);
  const [isPending, setIsPending] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [confirmRegister, setConfirmRegister] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ content: "", assigneeUserId: "", dueDate: "" });

  function saveDraft() {
    setIsPending(true);
    (async () => {
      const result = await saveDraftNoteAction(props.meetingId, content);
      setIsPending(false);
      if (result.ok) showToast("임시저장했어요");
    })();
  }

  function register() {
    setIsPending(true);
    (async () => {
      const result = await registerNoteAction(props.meetingId, content);
      setIsPending(false);
      setConfirmRegister(false);
      if (result.ok) {
        setStatus("등록");
        showToast("회의록이 등록됐어요. 참석자 전원에게 알림이 발송돼요.");
      }
    })();
  }

  function generateAi() {
    setIsPending(true);
    (async () => {
      const result = await generateAiDraftAction(props.meetingId, content);
      setIsPending(false);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setContent(result.data.content);
      showToast("AI 초안을 생성했어요");
    })();
  }

  function reassign(userId: string) {
    setIsPending(true);
    (async () => {
      const result = await reassignNoteAuthorAction(props.meetingId, userId);
      setIsPending(false);
      setShowReassign(false);
      if (result.ok) {
        showToast("작성자가 변경됐어요");
        router.refresh();
      }
    })();
  }

  function addActionItem() {
    if (!newItem.content.trim()) return;
    setIsPending(true);
    (async () => {
      const result = await createActionItemAction(props.meetingId, {
        content: newItem.content.trim(),
        assigneeUserId: newItem.assigneeUserId || undefined,
        dueDate: newItem.dueDate ? new Date(newItem.dueDate) : undefined,
      });
      setIsPending(false);
      if (result.ok) {
        setNewItem({ content: "", assigneeUserId: "", dueDate: "" });
        setShowAddItem(false);
        router.refresh();
      }
    })();
  }

  function toggleItem(id: string) {
    (async () => {
      await toggleActionItemDoneAction(id);
      router.refresh();
    })();
  }

  function deleteItem(id: string) {
    (async () => {
      await deleteActionItemAction(id);
      router.refresh();
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader title="회의록" backHref={`/meetings/${props.meetingId}`} />

      <div className="screen-scroll">
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{props.meetingTitle}</div>
        <div className="hint" style={{ marginBottom: 16 }}>상태: {status === "등록" ? "등록됨" : "임시저장"}</div>

        <div className="section">
          <div className="meta-box">
            <div className="minutes-meta-row">
              <span className="meta-label">일시</span>
              <span className="meta-value">{props.dateLabel}</span>
            </div>
            <div className="minutes-meta-row">
              <span className="meta-label">참석인원</span>
              <span className="meta-value">{props.participantsLabel}</span>
            </div>
            <div className="minutes-meta-row">
              <span className="meta-label">안건</span>
              <span className="meta-value">{props.agendaTitles.length > 0 ? props.agendaTitles.join(", ") : "없음"}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title-row">
            <div className="author-row">
              <span className="author-label">작성자</span>
              <span className="author-name">{props.authorName}</span>
            </div>
            {props.isOrganizer && (
              <button type="button" className="ghost-btn small" onClick={() => setShowReassign((v) => !v)}>
                변경
              </button>
            )}
          </div>

          {showReassign && (
            <div className="card" style={{ marginBottom: 10 }}>
              {props.participantsForReassign.map((p) => (
                <button key={p.id} type="button" className="btn btn-secondary" style={{ marginBottom: 4 }} onClick={() => reassign(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {props.isAuthor ? (
            <>
              <div className="notes-subtitle" style={{ marginBottom: 6 }}>회의 내용</div>
              <textarea className="notes-textarea" value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="notes-meta">
                {status === "등록" ? <span className="registered">✓ 등록됨</span> : "임시저장 상태"} {props.isAiGenerated && "· AI 초안 반영됨"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" className="ghost-btn" disabled={!content.trim() || isPending} onClick={generateAi}>
                  ✨ AI 초안 생성
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" disabled={isPending} onClick={saveDraft}>
                  임시저장
                </button>
                <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => setConfirmRegister(true)}>
                  등록
                </button>
              </div>
            </>
          ) : (
            <div className="meta-box">
              <div className="hint" style={{ marginBottom: 8 }}>이 회의록은 {props.authorName}님만 작성할 수 있어요</div>
              <div style={{ fontSize: 12.5, whiteSpace: "pre-line" }}>{content || "아직 작성된 내용이 없어요"}</div>
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title-row">
            <span className="section-title">향후 추진 과제</span>
          </div>
          {props.actionItems.length === 0 && (
            <div className="meta-box">
              <div style={{ fontSize: 12.5 }}>등록된 항목이 없어요</div>
            </div>
          )}
          {props.actionItems.map((item) => {
            const overdue = item.dueDate && !item.isDone && item.dueDate.getTime() < Date.now();
            return (
              <div key={item.id} className={`action-item-row${item.isDone ? " done" : ""}`}>
                <button type="button" className={`action-check${item.isDone ? " done" : ""}`} onClick={() => toggleItem(item.id)} aria-label="완료 체크">
                  {item.isDone && "✓"}
                </button>
                <div className="action-item-body">
                  <div className="action-item-content">{item.content}</div>
                  <div className="action-item-sub">
                    {item.assigneeName && <span className="assignee-chip">{item.assigneeName}</span>}
                    {item.dueDate && <span className={`due-chip${overdue ? " overdue" : ""}`}>{formatAbsoluteDate(item.dueDate)}</span>}
                  </div>
                </div>
                <button type="button" className="action-item-delete" onClick={() => deleteItem(item.id)} aria-label="삭제">
                  ×
                </button>
              </div>
            );
          })}

          {!showAddItem ? (
            <button type="button" className="ghost-btn" style={{ marginTop: 10 }} onClick={() => setShowAddItem(true)}>
              + 항목 추가
            </button>
          ) : (
            <div className="add-item-form" style={{ display: "block", marginTop: 10 }}>
              <div className="field-group">
                <input className="field" placeholder="내용" value={newItem.content} onChange={(e) => setNewItem((v) => ({ ...v, content: e.target.value }))} />
              </div>
              <div className="field-group">
                <select className="field" value={newItem.assigneeUserId} onChange={(e) => setNewItem((v) => ({ ...v, assigneeUserId: e.target.value }))}>
                  <option value="">담당자 선택 안함</option>
                  {props.candidateAssignees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <input type="date" className="field" value={newItem.dueDate} onChange={(e) => setNewItem((v) => ({ ...v, dueDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>
                  취소
                </button>
                <button type="button" className="btn btn-primary" disabled={!newItem.content.trim()} onClick={addActionItem}>
                  추가
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmRegister}
        title="회의록을 등록할까요?"
        message="등록하면 참석 인원 전체에게 알림이 발송돼요."
        pending={isPending}
        onConfirm={register}
        onCancel={() => setConfirmRegister(false)}
      />
    </div>
  );
}
