"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSession,
  clearSession,
  requireCurrentUser,
  TEMP_PASSWORD,
} from "@/lib/auth";

export type ActionResult =
  | { ok: true; redirectTo: string; isTempPassword?: boolean }
  | { ok: false; error: string };

const loginSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요.").email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

const DEMO_ACCOUNT_EMAIL = "kim.minjun@company.com";

function resolvePostLoginRedirect(user: { phone: string | null; onboardingSeenAt: Date | null }): string {
  if (!user.phone) return "/profile-setup";
  if (!user.onboardingSeenAt) return "/onboarding";
  return "/meetings";
}

export async function loginAction(input: { email: string; password: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { ok: false, error: "등록되지 않은 이메일입니다." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }

  await createSession(user.id);

  return {
    ok: true,
    redirectTo: resolvePostLoginRedirect(user),
    isTempPassword: parsed.data.password === TEMP_PASSWORD,
  };
}

/** 로그인 화면 "데모버전으로 체험하기" — 비밀번호 없이 데모 계정으로 바로 로그인 */
export async function demoLoginAction(): Promise<ActionResult> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_ACCOUNT_EMAIL } });
  if (!user) {
    return { ok: false, error: "데모 계정을 찾을 수 없어요. 시드 데이터를 확인해주세요." };
  }

  await createSession(user.id);

  return { ok: true, redirectTo: resolvePostLoginRedirect(user) };
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

const profileSchema = z.object({
  phone: z.string().min(1, "휴대폰 번호를 입력해주세요."),
  extension: z.string().optional(),
  messengerId: z.string().optional(),
  department: z.string().min(1, "부서를 입력해주세요."),
  rank: z.string().min(1, "직급을 입력해주세요."),
  position: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

async function saveProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireCurrentUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: parsed.data.phone,
      extension: parsed.data.extension || null,
      messengerId: parsed.data.messengerId || null,
      department: parsed.data.department,
      rank: parsed.data.rank,
      position: parsed.data.position || null,
    },
  });
  return { ok: true };
}

/** 화면14 최초 프로필 설정 — 저장 후 온보딩으로 이동 */
export async function completeProfileAction(input: ProfileInput): Promise<ActionResult> {
  const result = await saveProfile(input);
  if (!result.ok) return result;
  return { ok: true, redirectTo: "/onboarding" };
}

/** 화면16 내 정보 수정 — 저장 후 내 정보 화면에 머무름 */
export async function updateContactInfoAction(input: ProfileInput): Promise<ActionResult> {
  const result = await saveProfile(input);
  if (!result.ok) return result;
  return { ok: true, redirectTo: "/profile" };
}

/** 화면15 온보딩 완료 */
export async function markOnboardingSeenAction(): Promise<ActionResult> {
  const user = await requireCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { onboardingSeenAt: new Date() } });
  return { ok: true, redirectTo: "/meetings" };
}

