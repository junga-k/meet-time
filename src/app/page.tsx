import { redirect } from "next/navigation";

// URL로 처음 들어올 때는 세션이 남아있어도 항상 로그인 화면부터 보여준다
// (데모/제출용 접속 시 매번 명시적으로 로그인하도록 하기 위함).
export default function RootPage() {
  redirect("/login");
}
