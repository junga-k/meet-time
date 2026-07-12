import { z } from "zod";

// db_model_mvp.md에 정의된 모든 "고정 문자열 집합" 필드.
// SQLite Prisma는 네이티브 enum을 지원하지 않으므로 여기서 TS union + zod로 검증한다.

export const PARTICIPANT_ROLES = ["필수", "선택", "주최자"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];
export const participantRoleSchema = z.enum(PARTICIPANT_ROLES);

export const CONFIRMATION_STATUSES = ["미확인", "확정", "불참"] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];
export const confirmationStatusSchema = z.enum(CONFIRMATION_STATUSES);

export const ATTENDANCE_MODES = ["대면", "온라인", "무관"] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];
export const attendanceModeSchema = z.enum(ATTENDANCE_MODES);

export const MEETING_MODES = ["온라인", "오프라인", "하이브리드"] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];
export const meetingModeSchema = z.enum(MEETING_MODES);

export const MEETING_STATUSES = ["제안중", "확정", "재조율중", "취소"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];
export const meetingStatusSchema = z.enum(MEETING_STATUSES);

export const MEETING_STAGES = ["필수응답중", "선택확인중", "확정"] as const;
export type MeetingStage = (typeof MEETING_STAGES)[number];
export const meetingStageSchema = z.enum(MEETING_STAGES);

export const SLOT_RESPONSE_STATUSES = ["가능", "기피", "불가"] as const;
export type SlotResponseStatus = (typeof SLOT_RESPONSE_STATUSES)[number];
export const slotResponseStatusSchema = z.enum(SLOT_RESPONSE_STATUSES);

export const MITIGATION_STATUSES = ["대기", "수락", "유지"] as const;
export type MitigationStatus = (typeof MITIGATION_STATUSES)[number];
export const mitigationStatusSchema = z.enum(MITIGATION_STATUSES);

export const ROOM_BOOKING_STATUSES = ["확정", "취소"] as const;
export type RoomBookingStatus = (typeof ROOM_BOOKING_STATUSES)[number];
export const roomBookingStatusSchema = z.enum(ROOM_BOOKING_STATUSES);

export const MEETING_NOTE_STATUSES = ["임시저장", "등록"] as const;
export type MeetingNoteStatus = (typeof MEETING_NOTE_STATUSES)[number];
export const meetingNoteStatusSchema = z.enum(MEETING_NOTE_STATUSES);

export const NOTIFICATION_TYPES = [
  "안건등록",
  "안건수정",
  "안건삭제",
  "시간확정",
  "재조율",
  "완화요청",
  "참석재확인",
  "마감임박",
  "회의실확정",
  "불참안내",
  "응답요청",
  "회의록등록",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
