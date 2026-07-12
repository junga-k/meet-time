import type { NotificationType, MitigationStatus, MeetingStatus } from "@/lib/enums";

/** 내부 시스템 용어 → 화면 표시 문구. 데이터 값 자체는 유지하고 표시 라벨만 순화한다. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  안건등록: "안건 등록",
  안건수정: "안건 수정",
  안건삭제: "안건 삭제",
  시간확정: "시간 확정",
  재조율: "재조율",
  완화요청: "변경요청",
  참석재확인: "참석 재확인",
  마감임박: "마감 임박",
  회의실확정: "회의실 확정",
  불참안내: "불참 안내",
  응답요청: "응답 요청",
  회의록등록: "회의록 등록",
};

export const MITIGATION_STATUS_LABELS: Record<MitigationStatus, string> = {
  대기: "대기",
  수락: "가능으로 변경",
  유지: "불가로 유지",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  제안중: "제안중",
  확정: "확정",
  재조율중: "재조율중",
  취소: "취소",
};
