import type { MeetingStatus, MeetingStage, ParticipantRole, ConfirmationStatus } from "@/lib/enums";

/** 회의 카드(목록/최근회의 등)에서 공통으로 쓰는 뷰모델 — 화면1(내 회의), 예약 화면의 "내가 만든 회의"가 함께 사용 */
export type MeetingCardVM = {
  meetingId: string;
  title: string;
  status: MeetingStatus;
  stage: MeetingStage;
  myRole: ParticipantRole;
  myConfirmationStatus: ConfirmationStatus;
  myRespondedAt: Date | null;
  myReconfirmedAt: Date | null;
  confirmedStartTime: Date | null;
  confirmedEndTime: Date | null;
  hasRegisteredNote: boolean;
  isEnded: boolean;
};

export function isPendingReconfirm(vm: MeetingCardVM) {
  return vm.status === "확정" && !vm.myReconfirmedAt && vm.myConfirmationStatus !== "불참";
}

/** 회의 카드 클릭 시 이동할 경로를 회의 상태·내 역할·응답 여부에 따라 결정한다. 이동할 곳이 없으면 null. */
export function resolveMeetingCardHref(vm: MeetingCardVM): string | null {
  if (vm.hasRegisteredNote) return `/meetings/${vm.meetingId}`;

  if (vm.status === "확정") {
    if (isPendingReconfirm(vm)) return `/meetings/${vm.meetingId}/reconfirm`;
    // 주최자는 회의 시작 전까지 조율상황(응답 현황·회의실/모드 자동처리 결과 등)을 보는 대시보드로,
    // 시작 이후에는 참석자와 동일하게 회의 상세로 이동한다.
    const notStarted = vm.confirmedStartTime ? vm.confirmedStartTime.getTime() > Date.now() : false;
    if (vm.myRole === "주최자" && notStarted) return `/meetings/${vm.meetingId}/dashboard`;
    return `/meetings/${vm.meetingId}`;
  }

  if (vm.status === "재조율중") {
    if (vm.myRole === "주최자") return `/meetings/${vm.meetingId}/dashboard`;
    return null;
  }

  if (vm.status === "제안중") {
    if (vm.stage === "필수응답중" && (vm.myRole === "필수" || vm.myRole === "주최자") && !vm.myRespondedAt) {
      return `/meetings/${vm.meetingId}/respond`;
    }
    if (vm.myRole === "주최자") return `/meetings/${vm.meetingId}/dashboard`;
    if (vm.stage === "필수응답중") return null;
    if (vm.stage === "선택확인중") {
      if (vm.myRole === "선택" && !vm.myRespondedAt) return `/meetings/${vm.meetingId}/shortlist`;
      return null;
    }
  }

  return null;
}
