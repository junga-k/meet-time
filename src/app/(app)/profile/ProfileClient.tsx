"use client";

import { useState } from "react";
import { updateContactInfoAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useToast } from "@/components/ui/Toast";

export function ProfileClient(props: {
  name: string;
  email: string;
  profileImageUrl: string | null;
  department: string | null;
  rank: string | null;
  position: string | null;
  phone: string | null;
  extension: string | null;
  messengerId: string | null;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    department: props.department ?? "",
    rank: props.rank ?? "",
    position: props.position ?? "",
    phone: props.phone ?? "",
    extension: props.extension ?? "",
    messengerId: props.messengerId ?? "",
  });
  const [saved, setSaved] = useState(form);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  function saveProfile() {
    setProfileError(null);
    setProfilePending(true);
    (async () => {
      const result = await updateContactInfoAction(form);
      setProfilePending(false);
      if (!result.ok) {
        setProfileError(result.error);
        return;
      }
      setSaved(form);
      setEditing(false);
      showToast("저장됐어요");
    })();
  }

  const display = (v: string) => (v.trim() ? v : "-");

  return (
    <div className="profile-screen" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="page-header">
        <div className="page-header-top">
          <span className="page-title">내 정보</span>
          <button
            type="button"
            className="edit-link"
            onClick={() => {
              if (editing) setForm(saved);
              setEditing((v) => !v);
            }}
          >
            {editing ? "취소" : "수정"}
          </button>
        </div>
      </div>

      <div className="screen-scroll" style={{ paddingTop: 4 }}>
        <div className="profile-card">
          <Avatar name={props.name} profileImageUrl={props.profileImageUrl} size="lg" />
          <div>
            <div className="profile-name">{props.name}</div>
            <div className="profile-role-line">{props.email}</div>
          </div>
        </div>

        <div className="info-section">
          <div className="section-label">계정 정보</div>
          <div className="info-row">
            <span className="info-label">이름</span>
            <span className="info-value">{props.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">이메일</span>
            <span className="info-value">{props.email}</span>
          </div>
        </div>

        {!editing ? (
          <>
            <div className="info-section">
              <div className="section-label">소속</div>
              <div className="info-row">
                <span className="info-label">부서</span>
                <span className={`info-value${saved.department ? "" : " empty"}`}>{display(saved.department)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">직위</span>
                <span className={`info-value${saved.rank ? "" : " empty"}`}>{display(saved.rank)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">직책</span>
                <span className={`info-value${saved.position ? "" : " empty"}`}>{display(saved.position)}</span>
              </div>
            </div>
            <div className="info-section">
              <div className="section-label">연락처</div>
              <div className="info-row">
                <span className="info-label">휴대폰</span>
                <span className={`info-value${saved.phone ? "" : " empty"}`}>{display(saved.phone)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">내선번호</span>
                <span className={`info-value${saved.extension ? "" : " empty"}`}>{display(saved.extension)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">메신저 ID</span>
                <span className={`info-value${saved.messengerId ? "" : " empty"}`}>{display(saved.messengerId)}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="info-section">
              <div className="section-label">소속</div>
              <div className="field-group">
                <label className="field-label">부서</label>
                <input className="field" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">직위</label>
                <input className="field" value={form.rank} onChange={(e) => setForm((f) => ({ ...f, rank: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">
                  직책<span className="optional-mark">(선택)</span>
                </label>
                <input className="field" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
              </div>
            </div>
            <div className="info-section">
              <div className="section-label">연락처</div>
              <div className="field-group">
                <label className="field-label">휴대폰번호</label>
                <input className="field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">
                  내선번호<span className="optional-mark">(선택)</span>
                </label>
                <input className="field" value={form.extension} onChange={(e) => setForm((f) => ({ ...f, extension: e.target.value }))} />
              </div>
              <div className="field-group">
                <label className="field-label">
                  메신저 ID<span className="optional-mark">(선택)</span>
                </label>
                <input className="field" value={form.messengerId} onChange={(e) => setForm((f) => ({ ...f, messengerId: e.target.value }))} />
              </div>
            </div>
            {profileError && <div className="field-error" style={{ marginBottom: 12 }}>{profileError}</div>}
          </>
        )}

        <div style={{ marginTop: 32 }}>
          <LogoutButton />
        </div>
      </div>

      {editing && (
        <div className="footer">
          <button type="button" className="btn btn-primary" disabled={profilePending} onClick={saveProfile}>
            저장
          </button>
        </div>
      )}
    </div>
  );
}
