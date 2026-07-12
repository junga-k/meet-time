"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  createSession,
  clearSession,
  getCurrentUser,
  requireCurrentUser,
  TEMP_PASSWORD,
} from "@/lib/auth";
import { resetDemoAccountData, DEMO_ORGANIZER_EMAIL } from "@/server/demoSeed";

export type ActionResult =
  | { ok: true; redirectTo: string; isTempPassword?: boolean }
  | { ok: false; error: string };

const loginSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요.").email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

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

/**
 * 로그인 화면 "데모버전으로 체험하기" — 비밀번호 없이 데모 계정으로 바로 로그인.
 * 로그인→프로필설정→온보딩→내회의 4단계 흐름을 매번 그대로 보여주기 위해
 * resetDemoAccountData()가 phone/onboardingSeenAt을 포함한 계정 전체를 매 데모 로그인마다
 * 초기화한다(데모 전용 계정이라 부작용 없음). 데모 계정은 실제 DB row를 여러 리뷰어가
 * 순서대로 공유하는 구조라, 이전 세션에서 바꾼 프로필 사진·연락처·비밀번호나 새로 만든 회의가
 * 그대로 남아있으면 다음 리뷰어가 보는 화면이 처음 의도한 시나리오와 달라지기 때문.
 */
export async function demoLoginAction(): Promise<ActionResult> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_ORGANIZER_EMAIL } });
  if (!existing) {
    return { ok: false, error: "데모 계정을 찾을 수 없어요. 시드 데이터를 확인해주세요." };
  }

  await resetDemoAccountData();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } });

  await createSession(user.id);

  return { ok: true, redirectTo: resolvePostLoginRedirect(user) };
}

/**
 * 데모 계정으로 로그아웃할 때도 즉시 초기화한다 — 다음 리뷰어가 로그인 버튼을 누르기 전에
 * 브라우저를 닫거나 새로고침만 하는 경우까지 대비한 이중 안전장치(주 트리거는 demoLoginAction).
 */
export async function logoutAction() {
  const user = await getCurrentUser();
  if (user?.email === DEMO_ORGANIZER_EMAIL) {
    await resetDemoAccountData();
  }
  await clearSession();
  redirect("/login");
}

/**
 * 부서/직위/직책은 회사 디렉토리(HRIS/SSO)에서 동기화되는 값이라는 설계 전제라 이 폼으로 입력받지 않음
 * (와이어프레임 wireframe_13_profile_setup_1.html:182, wireframe_15_my_info_1.html:183) — "내 정보"·"프로필 설정"
 * 어느 화면에서도 항상 읽기 전용이고, 값이 틀리면 사내 HR/IT 시스템에서 갱신해야 함. 연락처만 사용자가 직접 입력.
 */
const profileSchema = z.object({
  phone: z.string().min(1, "휴대폰 번호를 입력해주세요."),
  extension: z.string().optional(),
  messengerId: z.string().optional(),
  profileImageUrl: z.string().optional(),
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
      ...(parsed.data.profileImageUrl ? { profileImageUrl: parsed.data.profileImageUrl } : {}),
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
  newPassword: z.string().min(4, "새 비밀번호는 4자 이상이어야 해요."),
});

/** 화면16 내 정보 수정모드 — 비밀번호 변경 */
export async function changePasswordAction(
  input: { currentPassword: string; newPassword: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireCurrentUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}

