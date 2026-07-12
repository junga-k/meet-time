"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction, demoLoginAction } from "@/server/actions/auth";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.isTempPassword) {
        showToast("임시 비밀번호를 사용 중이에요 — 내 정보에서 변경해주세요");
      }
      router.push(result.redirectTo);
    });
  }

  function handleDemoLogin() {
    setError(null);
    startTransition(async () => {
      const result = await demoLoginAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
    });
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 28px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          border: "1.5px solid var(--ink)",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>회의 일정 조율</div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 36 }}>
        여러 사람의 조건을 한 번에 이해하고
        <br />
        모두에게 괜찮은 시간을 자동으로 찾아드려요
      </div>

      <form onSubmit={handleSubmit} style={{ width: "100%", textAlign: "left" }}>
        <div className="field-group">
          <label className="field-label" htmlFor="email">
            사내 이메일
          </label>
          <input
            id="email"
            type="email"
            className="field"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            className="field"
            placeholder="임시 비밀번호는 1111"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
        <span style={{ fontSize: 11, color: "var(--muted)" }}>또는</span>
        <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleDemoLogin}
        disabled={isPending}
      >
        데모버전으로 체험하기
      </button>

      <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 28, padding: "0 8px" }}>
        계정은 사내 SSO 등록 이메일로 미리 발급되어 있어요.
        <br />
        최초 로그인은 임시 비밀번호(1111)로 진행하고,
        <br />
        이후 내 정보에서 비밀번호를 변경할 수 있어요.
        <br />
        비밀번호 없이 바로 둘러보려면 위 &ldquo;데모버전으로 체험하기&rdquo;를 눌러주세요.
      </div>
    </div>
  );
}
