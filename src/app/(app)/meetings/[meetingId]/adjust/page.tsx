import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRescheduleCapReached } from "@/lib/scheduling";
import { findAvailableRooms } from "@/server/actions/adjustment";
import { AdjustClient } from "./AdjustClient";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";

export default async function AdjustPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: { participants: { include: { user: true } } },
  });
  if (!meeting) notFound();
  if (meeting.organizerId !== user.id) redirect(`/meetings/${meeting.id}`);

  const mitigationHistory = await prisma.mitigationRequest.findMany({
    where: { meetingId: meeting.id },
    include: { targetUser: true, timeSlot: true },
    orderBy: { requestedAt: "asc" },
  });

  const rooms = await findAvailableRooms(meeting.id);

  return (
    <AdjustClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      rescheduleCount={meeting.rescheduleCount}
      rescheduleCapReached={isRescheduleCapReached(meeting.rescheduleCount)}
      hasConfirmedSlot={Boolean(meeting.confirmedSlotId)}
      participants={meeting.participants
        .filter((p) => p.role !== "주최자")
        .map((p) => ({ id: p.id, name: p.user.name, role: p.role as "필수" | "선택" }))}
      mitigationHistory={mitigationHistory.map((m, i) => ({
        seq: i + 1,
        targetName: m.targetUser.name,
        slotLabel: `${formatMeetingDate(m.timeSlot.startTime)} ${formatTimeRange(m.timeSlot.startTime, m.timeSlot.endTime)}`,
        status: m.status as "대기" | "수락" | "유지",
      }))}
      rooms={rooms}
      userName={user.name}
      userProfileImageUrl={user.profileImageUrl}
      userDepartment={user.department}
      userRank={user.rank}
      userPosition={user.position}
    />
  );
}
