import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      participants: { where: { userId: user.id } },
      agendas: { include: { author: true }, orderBy: [{ isRequired: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!meeting) notFound();
  const myParticipant = meeting.participants[0];
  if (!myParticipant) redirect("/meetings");

  return (
    <AgendaClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      agendaDeadline={meeting.agendaDeadline}
      currentUserId={user.id}
      userName={user.name}
      userProfileImageUrl={user.profileImageUrl}
      userDepartment={user.department}
      userRank={user.rank}
      userPosition={user.position}
      roleBadge={myParticipant.role}
      agendas={meeting.agendas.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        isRequired: a.isRequired,
        attachmentUrl: a.attachmentUrl,
        authorId: a.authorId,
        authorName: a.author.name,
        authorProfileImageUrl: a.author.profileImageUrl,
      }))}
    />
  );
}
