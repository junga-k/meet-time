import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAvailability } from "@/server/actions/rooms";
import { ReservationsClient } from "./ReservationsClient";

export default async function ReservationsPage() {
  const user = await requireCurrentUser();
  const today = new Date();

  const [rooms, recentMeetings] = await Promise.all([
    getRoomAvailability(today),
    prisma.participant.findMany({
      where: { userId: user.id },
      include: { meeting: { include: { confirmedSlot: true } } },
      orderBy: { meeting: { createdAt: "desc" } },
      take: 5,
    }),
  ]);

  return (
    <ReservationsClient
      initialDate={today.toISOString()}
      initialRooms={rooms}
      recentMeetings={recentMeetings.map((p) => ({
        id: p.meeting.id,
        title: p.meeting.title,
        status: p.meeting.status,
        confirmedStartTime: p.meeting.confirmedSlot?.startTime ?? null,
        confirmedEndTime: p.meeting.confirmedSlot?.endTime ?? null,
      }))}
    />
  );
}
