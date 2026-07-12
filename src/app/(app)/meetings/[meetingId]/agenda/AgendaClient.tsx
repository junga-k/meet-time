"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAgenda, updateAgenda, deleteAgenda } from "@/server/actions/agenda";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SubHeader } from "@/components/ui/SubHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";

type Agenda = {
  id: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  attachmentUrl: string | null;
  authorId: string;
  authorName: string;
  authorProfileImageUrl: string | null;
};

type FormState = { title: string; description: string; isRequired: boolean; attachmentUrl: string };
const EMPTY_FORM: FormState = { title: "", description: "", isRequired: false, attachmentUrl: "" };

export function AgendaClient({
  meetingId,
  meetingTitle,
  agendaDeadline,
  currentUserId,
  agendas,
  userName,
  userProfileImageUrl,
  userDepartment,
  userRank,
  userPosition,
  roleBadge,
}: {
  meetingId: string;
  meetingTitle: string;
  agendaDeadline: Date;
  currentUserId: string;
  agendas: Agenda[];
  userName: string;
  userProfileImageUrl: string | null;
  userDepartment: string | null;
  userRank: string | null;
  userPosition: string | null;
  roleBadge: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<{ kind: "save" | "delete"; targetId?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = agendaDeadline.getTime() < Date.now();
  const deadlineLabel = agendaDeadline.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }
  function openEdit(a: Agenda) {
    setForm({ title: a.title, description: a.description ?? "", isRequired: a.isRequired, attachmentUrl: a.attachmentUrl ?? "" });
    setEditingId(a.id);
    setOpenMenuId(null);
    setShowForm(true);
  }

  function handleSaveConfirmed() {
    setIsPending(true);
    (async () => {
      const input = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        isRequired: form.isRequired,
        attachmentUrl: form.attachmentUrl.trim() || undefined,
      };
      const result = editingId ? await updateAgenda(editingId, input) : await createAgenda(meetingId, input);
      setIsPending(false);
      setConfirm(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast(editingId ? "안건이 수정됐어요" : "안건이 등록됐어요");
      setShowForm(false);
      router.refresh();
    })();
  }

  function handleDeleteConfirmed(id: string) {
    setIsPending(true);
    (async () => {
      const result = await deleteAgenda(id);
      setIsPending(false);
      setConfirm(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast("안건이 삭제됐어요");
      router.refresh();
    })();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader
        title="안건"
        backHref={`/meetings/${meetingId}`}
        attendee={{ userName, userProfileImageUrl, userDepartment, userRank, userPosition, roleBadge }}
      />

      <div className="meta-row">
        <span>안건 마감</span>
        <span className="deadline">{deadlineLabel}</span>
      </div>
      <div className="instruction">{meetingTitle} · {isPastDeadline ? "마감이 지났지만 계속 등록·수정할 수 있어요." : "참석자 누구나 안건을 등록할 수 있어요."}</div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {agendas.length === 0 && <div className="hint" style={{ textAlign: "center", padding: "24px 0" }}>등록된 안건이 없어요</div>}
        {agendas.map((a) => (
          <div key={a.id} className={`agenda-card${a.isRequired ? " required" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {a.isRequired && <span className="required-badge">필독</span>}
                <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{a.title}</span>
              </div>
              {a.authorId === currentUserId && (
                <div style={{ position: "relative" }}>
                  <button type="button" className="kebab-btn" onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)} aria-label="더보기">
                    ⋮
                  </button>
                  {openMenuId === a.id && (
                    <div className="kebab-menu show">
                      <button type="button" onClick={() => openEdit(a)}>
                        수정
                      </button>
                      <button type="button" onClick={() => { setOpenMenuId(null); setConfirm({ kind: "delete", targetId: a.id }); }}>
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {a.description && <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 6 }}>{a.description}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Avatar name={a.authorName} profileImageUrl={a.authorProfileImageUrl} size="sm" />
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{a.authorName}</span>
              </div>
              {a.attachmentUrl && (
                <span className="attachment-chip">
                  📎 {a.attachmentUrl}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="footer">
        <button type="button" className="btn btn-secondary" onClick={openCreate}>
          + 안건 추가
        </button>
      </div>

      {showForm && (
        <div className="bottom-sheet-overlay" onClick={() => setShowForm(false)}>
          <div className="bottom-sheet-box" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <span className="bottom-sheet-title">{editingId ? "안건 수정" : "새 안건 등록"}</span>
              <button type="button" className="bottom-sheet-close" onClick={() => setShowForm(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="field-group">
                <label className="field-label">제목</label>
                <input className="field" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">설명</label>
                <textarea className="field" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="field-group">
                {form.attachmentUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="attachment-chip">📎 {form.attachmentUrl}</span>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, attachmentUrl: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                      ×
                    </button>
                  </div>
                )}
                <input type="file" onChange={(e) => setForm((f) => ({ ...f, attachmentUrl: e.target.files?.[0]?.name ?? "" }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
                필독 안건으로 표시
              </label>
              {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
            </div>
            <div className="bottom-sheet-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                취소
              </button>
              <button type="button" className="btn btn-primary" disabled={!form.title.trim()} onClick={() => setConfirm({ kind: "save" })}>
                {editingId ? "수정 완료" : "안건 등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm?.kind === "save"}
        title={editingId ? "안건을 수정하시겠습니까?" : "안건을 등록하시겠습니까?"}
        message="참석자 전원(작성자 본인 제외)에게 알림이 발송돼요."
        pending={isPending}
        onConfirm={handleSaveConfirmed}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete"}
        title="이 안건을 삭제하시겠습니까?"
        message="삭제하면 되돌릴 수 없어요."
        danger
        pending={isPending}
        onConfirm={() => confirm?.targetId && handleDeleteConfirmed(confirm.targetId)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
