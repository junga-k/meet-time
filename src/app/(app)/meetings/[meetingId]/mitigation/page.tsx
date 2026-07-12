import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MitigationClient } from "./MitigationClient";
import { formatMeetingDate, formatTimeRange } from "@/lib/dates";
import { SubHeader } from "@/components/ui/SubHeader";

export default async function MitigationPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: { participants: { where: { userId: user.id } } },
  });
  if (!meeting) notFound();

  const attendee = {
    userName: user.name,
    userProfileImageUrl: user.profileImageUrl,
    userDepartment: user.department,
    userRank: user.rank,
    userPosition: user.position,
    roleBadge: meeting.participants[0]?.role ?? "필수",
  };

  const request = await prisma.mitigationRequest.findFirst({
    where: { meetingId: meeting.id, targetUserId: user.id, status: "대기" },
    include: { timeSlot: true },
  });

  if (!request) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <SubHeader title="변경요청" backHref="/meetings" attendee={attendee} />
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{meeting.title}</div>
          <div className="hint">현재 응답할 변경요청이 없어요.</div>
        </div>
      </div>
    );
  }

  const myResponse = await prisma.slotResponse.findUnique({
    where: { timeSlotId_userId: { timeSlotId: request.timeSlotId, userId: user.id } },
  });

  return (
    <MitigationClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      mitigationRequestId={request.id}
      slotLabel={`${formatMeetingDate(request.timeSlot.startTime)} ${formatTimeRange(request.timeSlot.startTime, request.timeSlot.endTime)}`}
      myConstraintStatus={(myResponse?.status as "불가" | "기피" | undefined) ?? "불가"}
      attendee={attendee}
    />
  );
}
