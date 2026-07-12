"use client";

import { useState } from "react";
import { updateContactInfoAction, changePasswordAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useToast } from "@/components/ui/Toast";
import { formatMobilePhone, formatLandlinePhone } from "@/lib/phone";

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
    phone: props.phone ?? "",
    extension: props.extension ?? "",
    messengerId: props.messengerId ?? "",
  });
  const [saved, setSaved] = useState(form);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwPending, setPwPending] = useState(false);

  function changePassword() {
    setPwError(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("새 비밀번호가 서로 일치하지 않아요.");
      return;
    }
    setPwPending(true);
    (async () => {
      const result = await changePasswordAction({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwPending(false);
      if (!result.ok) {
        setPwError(result.error);
        return;
      }
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("비밀번호가 변경됐어요");
    })();
  }

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
              if (editing) {
                setForm(saved);
                setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setPwError(null);
              }
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

        {/* 부서·직위·직책은 회사 디렉토리(SSO/HRIS) 동기화 값이라 수정 모드에서도 항상 읽기 전용 */}
        <div className="info-section">
          <div className="section-label">소속</div>
          <div className="info-row">
            <span className="info-label">부서</span>
            <span className={`info-value${props.department ? "" : " empty"}`}>{display(props.department ?? "")}</span>
          </div>
          <div className="info-row">
            <span className="info-label">직위</span>
            <span className={`info-value${props.rank ? "" : " empty"}`}>{display(props.rank ?? "")}</span>
          </div>
          <div className="info-row">
            <span className="info-label">직책</span>
            <span className={`info-value${props.position ? "" : " empty"}`}>{display(props.position ?? "")}</span>
          </div>
        </div>

        {!editing ? (
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
              <span className="info-label">사내메신저</span>
              <span className={`info-value${saved.messengerId ? "" : " empty"}`}>{display(saved.messengerId)}</span>
            </div>
          </div>
        ) : (
          <div className="info-section">
            <div className="section-label">연락처</div>
            <div className="field-group">
              <label className="field-label">휴대폰번호</label>
              <input
                className="field"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: formatMobilePhone(e.target.value) }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">
                내선번호<span className="optional-mark">(선택)</span>
              </label>
              <input
                className="field"
                inputMode="numeric"
                value={form.extension}
                onChange={(e) => setForm((f) => ({ ...f, extension: formatLandlinePhone(e.target.value) }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">
                사내메신저<span className="optional-mark">(선택)</span>
              </label>
              <input
                className="field"
                value={form.messengerId}
                onChange={(e) => setForm((f) => ({ ...f, messengerId: e.target.value }))}
                placeholder="사내메신저 아이디를 입력해주세요"
              />
            </div>
            {profileError && <div className="field-error" style={{ marginBottom: 12 }}>{profileError}</div>}
          </div>
        )}

        {editing && (
          <div className="info-section">
            <div className="section-label">비밀번호 변경</div>
            <div className="field-group">
              <label className="field-label">현재 비밀번호</label>
              <input
                type="password"
                className="field"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">새 비밀번호</label>
              <input
                type="password"
                className="field"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div className="field-group">
              <label className="field-label">새 비밀번호 확인</label>
              <input
                type="password"
                className="field"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            {pwError && <div className="field-error" style={{ marginBottom: 12 }}>{pwError}</div>}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pwPending || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
              onClick={changePassword}
            >
              {pwPending ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        )}

        {!editing && (
          <div style={{ marginTop: 32 }}>
            <LogoutButton />
          </div>
        )}
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
