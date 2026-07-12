import { notFound, redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShortlistClient } from "./ShortlistClient";
import type { SlotResponseStatus } from "@/lib/enums";

export default async function ShortlistPage({ params }: { params: { meetingId: string } }) {
  const user = await requireCurrentUser();
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      timeSlots: {
        where: { isShortlisted: true },
        orderBy: { startTime: "asc" },
        include: { slotResponses: { where: { userId: user.id } } },
      },
      participants: { where: { userId: user.id } },
    },
  });
  if (!meeting) notFound();

  const participant = meeting.participants[0];
  if (!participant) redirect("/meetings");
  if (participant.role !== "선택") redirect(`/meetings/${meeting.id}/respond`);

  if (meeting.stage === "필수응답중") {
    return (
      <div style={{ padding: "40px 8px", textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{meeting.title}</div>
        <div className="hint">필수 참석자 응답이 모이면 후보 시간을 확인할 수 있어요. 잠시만 기다려주세요.</div>
      </div>
    );
  }

  const slots = meeting.timeSlots.map((s) => ({
    id: s.id,
    startTime: s.startTime,
    endTime: s.endTime,
    myStatus: (s.slotResponses[0]?.status as SlotResponseStatus | undefined) ?? null,
  }));

  return (
    <ShortlistClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      optionalResponseDeadline={meeting.optionalResponseDeadline}
      isEditable={meeting.stage === "선택확인중"}
      slots={slots}
      computedMode={meeting.mode as "온라인" | "오프라인" | "하이브리드" | null}
      initialAttendanceMode={participant.attendanceMode as "대면" | "온라인" | "무관" | null}
      alreadyResponded={Boolean(participant.respondedAt)}
      userName={user.name}
      userDepartment={user.department}
      userRank={user.rank}
      userProfileImageUrl={user.profileImageUrl}
    />
  );
}
