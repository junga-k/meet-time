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
          부서·직위·직책은 회사 디렉토리 정보를 자동으로 반영해요.
          <br />
          자세한 내용은 &quot;내 정보&quot; 화면에서 확인할 수 있어요
        </div>

        <ProfileSetupForm name={user.name} profileImageUrl={user.profileImageUrl} />
      </div>
    </div>
  );
}
