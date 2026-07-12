import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubHeader } from "@/components/ui/SubHeader";
import { MeetingCreateForm } from "./MeetingCreateForm";

export default async function NewMeetingPage() {
  const user = await requireCurrentUser();
  const otherUsers = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, name: true, department: true, rank: true, position: true, profileImageUrl: true },
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <SubHeader title="회의 생성" />
      <div className="screen-scroll">
        <MeetingCreateForm candidates={otherUsers} />
      </div>
    </div>
  );
}
