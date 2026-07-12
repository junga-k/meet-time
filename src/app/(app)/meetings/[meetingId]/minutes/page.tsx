import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortParticipantsForMinutes } from "@/lib/scheduling";
import { formatAbsoluteDate, formatTimeRange } from "@/lib/dates";
import { MinutesClient } from "./MinutesClient";

export default async function MinutesPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      confirmedSlot: true,
      participants: { include: { user: true } },
      agendas: true,
      meetingNote: { include: { authorUser: true } },
      actionItems: { include: { assigneeUser: true, creator: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!meeting) notFound();

  const myParticipant = meeting.participants.find((p) => p.userId === user.id);
  if (!myParticipant) redirect("/meetings");

  const meetingStarted = meeting.confirmedSlot ? meeting.confirmedSlot.startTime.getTime() <= Date.now() : false;
  if (!meetingStarted) redirect(`/meetings/${meeting.id}`);

  const sortedParticipants = sortParticipantsForMinutes(
    meeting.participants.map((p) => ({ id: p.id, name: p.user.name, rank: p.user.rank }))
  );

  const authorId = meeting.meetingNote?.authorUserId ?? meeting.organizerId;
  const isAuthor = authorId === user.id;
  const authorName = meeting.meetingNote?.authorUser?.name ?? meeting.participants.find((p) => p.userId === meeting.organizerId)?.user.name ?? "";

  return (
    <MinutesClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      dateLabel={meeting.confirmedSlot ? `${formatAbsoluteDate(meeting.confirmedSlot.startTime)} ${formatTimeRange(meeting.confirmedSlot.startTime, meeting.confirmedSlot.endTime)}` : ""}
      participantsLabel={sortedParticipants.map((p) => `${p.rank ?? ""} ${p.name}`.trim()).join(", ")}
      agendaTitles={meeting.agendas.map((a) => a.title)}
      isOrganizer={meeting.organizerId === user.id}
      isAuthor={isAuthor}
      authorName={authorName}
      noteContent={meeting.meetingNote?.content ?? ""}
      noteStatus={(meeting.meetingNote?.status as "임시저장" | "등록" | undefined) ?? "임시저장"}
      isAiGenerated={meeting.meetingNote?.isAiGenerated ?? false}
      participantsForReassign={meeting.participants.map((p) => ({ id: p.userId, name: p.user.name }))}
      actionItems={meeting.actionItems.map((a) => ({
        id: a.id,
        content: a.content,
        assigneeName: a.assigneeUser?.name ?? null,
        dueDate: a.dueDate,
        isDone: a.isDone,
      }))}
      candidateAssignees={meeting.participants.map((p) => ({ id: p.userId, name: p.user.name }))}
    />
  );
}
