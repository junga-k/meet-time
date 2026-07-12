"use client";

import { logoutAction } from "@/server/actions/auth";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => logoutAction()}
      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5, cursor: "pointer", padding: 4 }}
    >
      로그아웃
    </button>
  );
}
