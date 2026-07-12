import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RespondClient } from "./RespondClient";
import type { SlotResponseStatus } from "@/lib/enums";

export default async function RespondPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      timeSlots: { orderBy: { startTime: "asc" }, include: { slotResponses: { where: { userId: user.id } } } },
      participants: { where: { userId: user.id } },
    },
  });
  if (!meeting) notFound();

  const participant = meeting.participants[0];
  if (!participant) redirect("/meetings");
  if (participant.role === "선택") redirect(`/meetings/${meeting.id}/shortlist`);

  const slots = meeting.timeSlots.map((s) => ({
    id: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    myStatus: (s.slotResponses[0]?.status ?? "가능") as SlotResponseStatus,
  }));

  return (
    <RespondClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      requiredResponseDeadline={meeting.requiredResponseDeadline}
      isEditable={meeting.stage === "필수응답중"}
      slots={slots}
      alreadyResponded={Boolean(participant.respondedAt)}
      userName={user.name}
      userDepartment={user.department}
      userRank={user.rank}
      userProfileImageUrl={user.profileImageUrl}
    />
  );
}
