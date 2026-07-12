"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeProfileAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/Avatar";

export function ProfileSetupForm({ name, profileImageUrl }: { name: string; profileImageUrl: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    department: "",
    rank: "",
    position: "",
    phone: "",
    extension: "",
    messengerId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = form.department.trim() && form.rank.trim() && form.phone.trim();

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeProfileAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="section">
        <div className="section-label">프로필 사진</div>
        <div className="avatar-upload-row">
          <div className="avatar-photo-wrap">
            <Avatar name={name} profileImageUrl={profileImageUrl} size="lg" />
            <button type="button" className="avatar-edit-btn" aria-label="프로필 사진 변경">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>
          <div className="hint">계정 사진이 없으면 이름 첫 글자로 표시돼요.</div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">소속 정보</div>
        <div className="field-group">
          <label className="field-label" htmlFor="department">
            부서<span className="required-mark">(필수)</span>
          </label>
          <input id="department" className="field" value={form.department} onChange={update("department")} placeholder="예: 기획팀" required />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="rank">
            직급<span className="required-mark">(필수)</span>
          </label>
          <input id="rank" className="field" value={form.rank} onChange={update("rank")} placeholder="예: 대리" required />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="position">
            직책<span className="optional-mark">(선택)</span>
          </label>
          <input id="position" className="field" value={form.position} onChange={update("position")} placeholder="예: 팀장" />
        </div>
      </div>

      <div className="section">
        <div className="section-label">연락처</div>
        <div className="field-group">
          <label className="field-label" htmlFor="phone">
            휴대폰번호<span className="required-mark">(필수)</span>
          </label>
          <input id="phone" type="tel" inputMode="numeric" className="field" value={form.phone} onChange={update("phone")} placeholder="숫자만 입력해주세요" required />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="extension">
            내선번호<span className="optional-mark">(선택)</span>
          </label>
          <input id="extension" inputMode="numeric" className="field" value={form.extension} onChange={update("extension")} placeholder="숫자만 입력해주세요" />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="messengerId">
            메신저 ID<span className="optional-mark">(선택)</span>
          </label>
          <input id="messengerId" className="field" value={form.messengerId} onChange={update("messengerId")} placeholder="예: Slack @jeongah" />
        </div>
        <div className="hint">여기서 입력한 정보는 나중에 &quot;내 정보&quot; 화면에서 언제든 수정할 수 있어요</div>
      </div>

      {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={!canSubmit || isPending}>
        {isPending ? "저장 중..." : "시작하기"}
      </button>
    </form>
  );
}
