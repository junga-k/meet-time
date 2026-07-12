import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreSlotsForMeeting, rankSlots, isRescheduleCapReached } from "@/lib/scheduling";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      participants: { include: { user: true } },
      roomBooking: { include: { room: true } },
      confirmedSlot: true,
    },
  });
  if (!meeting) notFound();
  if (meeting.organizerId !== user.id) redirect(`/meetings/${meeting.id}`);

  const scores = await scoreSlotsForMeeting(meeting.id);
  const ranked = rankSlots(scores).slice(0, 8);
  const slotDetails = await prisma.timeSlot.findMany({
    where: { id: { in: ranked.map((r) => r.timeSlotId) } },
  });
  const rankingRows = ranked.map((r) => {
    const slot = slotDetails.find((s) => s.id === r.timeSlotId)!;
    return { timeSlotId: r.timeSlotId, startTime: slot.startTime, endTime: slot.endTime, hardPass: r.hardPass, unavailCount: r.unavailCount };
  });

  const shortlisted = await prisma.timeSlot.findMany({
    where: { meetingId: meeting.id, isShortlisted: true },
    orderBy: { startTime: "asc" },
    include: { slotResponses: { where: { user: { participants: { some: { meetingId: meeting.id, role: "선택" } } } } } },
  });

  const pendingMitigation = await prisma.mitigationRequest.findFirst({
    where: { meetingId: meeting.id, status: "대기" },
    include: { targetUser: true, timeSlot: true },
  });
  const exhaustedMitigation =
    !pendingMitigation && meeting.status === "제안중" && meeting.stage === "선택확인중" && rankingRows.every((r) => !r.hardPass);

  return (
    <DashboardClient
      meetingId={meeting.id}
      title={meeting.title}
      status={meeting.status as "제안중" | "확정" | "재조율중" | "취소"}
      stage={meeting.stage as "필수응답중" | "선택확인중" | "확정"}
      mode={meeting.mode as "온라인" | "오프라인" | "하이브리드" | null}
      participants={meeting.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        role: p.role as "필수" | "선택" | "주최자",
        respondedAt: p.respondedAt,
        confirmationStatus: p.confirmationStatus as "미확인" | "확정" | "불참",
      }))}
      rankingRows={rankingRows}
      shortlistedSlots={shortlisted.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        optionalAvailable: s.slotResponses.filter((r) => r.status === "가능").length,
        optionalDeclined: s.slotResponses.filter((r) => r.status === "불가").length,
      }))}
      confirmedStartTime={meeting.confirmedSlot?.startTime ?? null}
      confirmedEndTime={meeting.confirmedSlot?.endTime ?? null}
      roomName={meeting.roomBooking?.room.name ?? null}
      videoLink={meeting.videoLink}
      rescheduleCount={meeting.rescheduleCount}
      rescheduleCapReached={isRescheduleCapReached(meeting.rescheduleCount)}
      pendingMitigation={
        pendingMitigation
          ? { targetName: pendingMitigation.targetUser.name, startTime: pendingMitigation.timeSlot.startTime }
          : null
      }
      exhaustedMitigation={exhaustedMitigation}
      userName={user.name}
      userProfileImageUrl={user.profileImageUrl}
      userDepartment={user.department}
      userRank={user.rank}
      userPosition={user.position}
    />
  );
}
