import { requireCurrentUser } from "@/lib/auth";
import { ProfileSetupForm } from "./ProfileSetupForm";
import { Avatar } from "@/components/ui/Avatar";

export default async function ProfileSetupPage() {
  const user = await requireCurrentUser();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "32px 16px 12px" }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>프로필을 완성해주세요</span>
      </div>

      <div className="screen-scroll" style={{ paddingTop: 6 }}>
        <div className="readonly-card">
          <Avatar name={user.name} profileImageUrl={user.profileImageUrl} size="md" />
          <div className="readonly-info">
            <div className="readonly-name">{user.name}</div>
            <div className="readonly-email">{user.email}</div>
          </div>
          <span className="readonly-tag">계정 연동됨</span>
        </div>
        <div className="hint" style={{ marginBottom: 32 }}>
          이 정보는 나중에 &quot;내 정보&quot; 화면에서 언제든 수정할 수 있어요
        </div>

        <ProfileSetupForm name={user.name} profileImageUrl={user.profileImageUrl} />
      </div>
    </div>
  );
}
