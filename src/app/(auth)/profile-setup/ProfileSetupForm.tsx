"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeProfileAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { formatMobilePhone, formatLandlinePhone } from "@/lib/phone";
import { resizeImageToDataUri } from "@/lib/image";

export function ProfileSetupForm({ name, profileImageUrl }: { name: string; profileImageUrl: string | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    phone: "",
    extension: "",
    messengerId: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(profileImageUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = form.phone.trim();

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function updatePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, phone: formatMobilePhone(e.target.value) }));
  }

  function updateExtension(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, extension: formatLandlinePhone(e.target.value) }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUri = await resizeImageToDataUri(file);
      setPhotoPreview(dataUri);
    } catch {
      showToast("사진을 불러오지 못했어요. 다시 시도해주세요.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeProfileAction({
        ...form,
        ...(photoPreview && photoPreview !== profileImageUrl ? { profileImageUrl: photoPreview } : {}),
      });
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
            <Avatar name={name} profileImageUrl={photoPreview} size="lg" />
            <button
              type="button"
              className="avatar-edit-btn"
              aria-label="프로필 사진 변경"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
          </div>
          <div className="hint">계정 사진이 없으면 이름 첫 글자로 표시돼요.</div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">연락처</div>
        <div className="field-group">
          <label className="field-label" htmlFor="phone">
            휴대폰번호<span className="required-mark">(필수)</span>
          </label>
          <input id="phone" type="tel" inputMode="numeric" className="field" value={form.phone} onChange={updatePhone} placeholder="숫자만 입력해주세요" required />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="extension">
            내선번호<span className="optional-mark">(선택)</span>
          </label>
          <input id="extension" inputMode="numeric" className="field" value={form.extension} onChange={updateExtension} placeholder="숫자만 입력해주세요" />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="messengerId">
            사내메신저<span className="optional-mark">(선택)</span>
          </label>
          <input id="messengerId" className="field" value={form.messengerId} onChange={update("messengerId")} placeholder="사내메신저 아이디를 입력해주세요" />
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
