import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TabBar } from "@/components/ui/TabBar";
import { StatusBar } from "@/components/ui/StatusBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  // 프로필 설정/온보딩을 완료하지 않은 상태로 (app) 라우트에 직접 진입한 경우 방어적으로 되돌림
  if (!user.phone) {
    redirect("/profile-setup");
  }
  if (!user.onboardingSeenAt) {
    redirect("/onboarding");
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <div className="safe-area-shell" style={{ ["--toast-bottom" as string]: "101px" }}>
      <StatusBar />
      <div className="app-body">{children}</div>
      <TabBar hasUnreadNotifications={unreadCount > 0} />
    </div>
  );
}
