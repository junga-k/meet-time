import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReconfirmClient } from "./ReconfirmClient";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";

export default async function ReconfirmPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      confirmedSlot: true,
      roomBooking: { include: { room: true } },
      participants: { where: { userId: user.id } },
    },
  });
  if (!meeting) notFound();
  if (meeting.status !== "확정" || !meeting.confirmedSlot) redirect(`/meetings/${meeting.id}`);

  const participant = meeting.participants[0];
  if (!participant) redirect("/meetings");

  const otherUsers = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <ReconfirmClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      slotLabel={`${formatMeetingDate(meeting.confirmedSlot.startTime)} ${formatTimeRange(meeting.confirmedSlot.startTime, meeting.confirmedSlot.endTime)}`}
      roomName={meeting.roomBooking?.room.name ?? null}
      videoLink={meeting.videoLink}
      myAttendanceMode={participant.attendanceMode as "대면" | "온라인" | "무관" | null}
      myRole={participant.role as "필수" | "선택" | "주최자"}
      alreadyReconfirmed={Boolean(participant.reconfirmedAt)}
      otherUsers={otherUsers}
      userName={user.name}
      userProfileImageUrl={user.profileImageUrl}
      userDepartment={user.department}
      userRank={user.rank}
      userPosition={user.position}
    />
  );
}
