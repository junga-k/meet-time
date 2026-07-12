import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 세션이 남아있어도 /login에 직접 들어오면 그대로 로그인 화면을 보여준다
  // (URL로 처음 접속할 때 항상 로그인 화면부터 시작하도록 하기 위해 자동 우회를 없앰).

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
