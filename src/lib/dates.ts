// 영업일(월~금) 계산 유틸. 공휴일 테이블은 MVP 범위 밖(db_model_mvp.md 스키마 레벨 비즈니스 규칙 참고).

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** date로부터 n영업일 뒤(주말 건너뛰기)의 날짜를 반환 (date 자신은 카운트하지 않음) */
export function addBusinessDays(date: Date, n: number): Date {
  let result = startOfDay(date);
  let remaining = n;
  while (remaining > 0) {
    result = addDays(result, 1);
    if (isWeekday(result)) remaining -= 1;
  }
  return result;
}

/** start~end(둘 다 포함, 날짜 단위) 사이의 영업일 수 */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  let cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor.getTime() <= endDay.getTime()) {
    if (isWeekday(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/** candidateStartDate가 createdAt으로부터 최소 3영업일 이후인지 검증 */
export function validateCandidateStartDate(createdAt: Date, candidateStartDate: Date): boolean {
  const minStart = addBusinessDays(createdAt, 3);
  return startOfDay(candidateStartDate).getTime() >= minStart.getTime();
}

/** 후보 기간(candidateStartDate~candidateEndDate)에 평일이 최소 1일 포함되는지 검증 */
export function hasWeekdayInRange(start: Date, end: Date): boolean {
  let cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor.getTime() <= endDay.getTime()) {
    if (isWeekday(cursor)) return true;
    cursor = addDays(cursor, 1);
  }
  return false;
}

/**
 * 필수/선택 응답 마감을 계산한다.
 * N = createdAt ~ (candidateStartDate 전날) 사이의 영업일 수, 필수 마감은 1/5 지점, 선택 마감은 2/5 지점.
 * 각 지점은 "N * fraction"을 반올림한 영업일 수만큼 createdAt에서 진행한 날의 23:59:59로 계산한다.
 */
export function computeResponseDeadlines(
  createdAt: Date,
  candidateStartDate: Date
): { requiredResponseDeadline: Date; optionalResponseDeadline: Date } {
  const dayBeforeCandidate = addDays(startOfDay(candidateStartDate), -1);
  const n = Math.max(1, businessDaysBetween(startOfDay(createdAt), dayBeforeCandidate));

  const requiredOffset = Math.max(1, Math.round(n * (1 / 5)));
  const optionalOffset = Math.max(requiredOffset + 1, Math.round(n * (2 / 5)));

  const endOfDayAt = (d: Date) => {
    const r = new Date(d);
    r.setHours(23, 59, 59, 0);
    return r;
  };

  return {
    requiredResponseDeadline: endOfDayAt(addBusinessDays(createdAt, requiredOffset)),
    optionalResponseDeadline: endOfDayAt(addBusinessDays(createdAt, optionalOffset)),
  };
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 회의 인스턴스 날짜 표기: M/D(요일) — 예: "7/14(화)" */
export function formatMeetingDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY_LABELS[date.getDay()]})`;
}

/** 절대 날짜(예약/회의록류) 표기: YYYY.MM.DD (요일) */
export function formatAbsoluteDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d} (${WEEKDAY_LABELS[date.getDay()]})`;
}

export function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** year/month(0-indexed)의 달력 그리드 — 일요일 시작, 앞뒤 빈칸 포함 6주 이하로 채움 */
export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
