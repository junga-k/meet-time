import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAvailability, getMyRoomReservations } from "@/server/actions/rooms";
import type { MeetingCardVM } from "@/lib/meetingCard";
import { ReservationsClient } from "./ReservationsClient";

export default async function ReservationsPage() {
  const user = await requireCurrentUser();
  const today = new Date();
  const now = Date.now();

  const [rooms, myMeetings, myRoomReservations] = await Promise.all([
    getRoomAvailability(today),
    prisma.meeting.findMany({
      where: { organizerId: user.id },
      include: {
        confirmedSlot: true,
        meetingNote: true,
        participants: { where: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMyRoomReservations(user.id),
  ]);

  const myMeetingCards: MeetingCardVM[] = myMeetings.map((m) => {
    const me = m.participants[0];
    return {
      meetingId: m.id,
      title: m.title,
      status: m.status as MeetingCardVM["status"],
      stage: m.stage as MeetingCardVM["stage"],
      myRole: (me?.role as MeetingCardVM["myRole"]) ?? "주최자",
      myConfirmationStatus: (me?.confirmationStatus as MeetingCardVM["myConfirmationStatus"]) ?? "미확인",
      myRespondedAt: me?.respondedAt ?? null,
      myReconfirmedAt: me?.reconfirmedAt ?? null,
      confirmedStartTime: m.confirmedSlot?.startTime ?? null,
      confirmedEndTime: m.confirmedSlot?.endTime ?? null,
      hasRegisteredNote: m.meetingNote?.status === "등록",
      isEnded: m.confirmedSlot ? m.confirmedSlot.endTime.getTime() < now : false,
    };
  });

  return (
    <ReservationsClient
      initialDate={today.toISOString()}
      initialRooms={rooms}
      myMeetings={myMeetingCards}
      myRoomReservations={myRoomReservations}
    />
  );
}
