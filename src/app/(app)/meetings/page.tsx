import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MeetingListClient, type MeetingCardVM } from "./MeetingListClient";

export default async function MeetingsPage() {
  const user = await requireCurrentUser();

  const participants = await prisma.participant.findMany({
    where: { userId: user.id },
    include: {
      meeting: {
        include: {
          confirmedSlot: true,
          meetingNote: true,
        },
      },
    },
  });

  const now = Date.now();

  const cards: MeetingCardVM[] = participants.map((p) => {
    const m = p.meeting;
    const sortKey =
      m.status === "제안중" || m.status === "재조율중"
        ? (m.stage === "선택확인중" ? m.optionalResponseDeadline : m.requiredResponseDeadline).getTime()
        : (m.confirmedSlot?.startTime.getTime() ?? m.createdAt.getTime());

    return {
      meetingId: m.id,
      title: m.title,
      status: m.status as MeetingCardVM["status"],
      stage: m.stage as MeetingCardVM["stage"],
      myRole: p.role as MeetingCardVM["myRole"],
      myConfirmationStatus: p.confirmationStatus as MeetingCardVM["myConfirmationStatus"],
      myRespondedAt: p.respondedAt,
      myReconfirmedAt: p.reconfirmedAt,
      confirmedStartTime: m.confirmedSlot?.startTime ?? null,
      confirmedEndTime: m.confirmedSlot?.endTime ?? null,
      hasRegisteredNote: m.meetingNote?.status === "등록",
      isEnded: m.confirmedSlot ? m.confirmedSlot.endTime.getTime() < now : false,
      sortKey,
    };
  });

  cards.sort((a, b) => a.sortKey - b.sortKey);

  return <MeetingListClient meetings={cards} />;
}
