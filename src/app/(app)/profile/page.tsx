import { requireCurrentUser } from "@/lib/auth";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return (
    <ProfileClient
      name={user.name}
      email={user.email}
      profileImageUrl={user.profileImageUrl}
      department={user.department}
      rank={user.rank}
      position={user.position}
      phone={user.phone}
      extension={user.extension}
      messengerId={user.messengerId}
    />
  );
}
