import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";
import { DEMO_ORGANIZER_EMAIL, ensureDemoAccountFresh } from "@/server/demoSeed";

export { SESSION_COOKIE_NAME };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await signSessionToken(userId);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

/**
 * cache()로 감싸 같은 요청 내 여러 호출((app)/layout.tsx + 각 page.tsx 등)이 한 번만
 * 실행되도록 한다 — 데모 계정 유휴 체크(ensureDemoAccountFresh)가 요청당 한 번만 돌아야
 * lastActiveAt 갱신/리셋 판단이 꼬이지 않는다.
 */
export const getCurrentUser = cache(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (user.email === DEMO_ORGANIZER_EMAIL) {
    return ensureDemoAccountFresh(user);
  }
  return user;
});

/** 로그인 필수 화면에서 사용 — 세션이 없으면 /login으로 리다이렉트 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** 시드로 발급되는 공통 임시 비밀번호 — 로그인 직후 "임시 비밀번호 사용 중" 안내 토스트 판단에 사용 */
export const TEMP_PASSWORD = "1111";
