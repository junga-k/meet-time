"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMeetingDate, formatTimeRange, isSameDay, startOfDay } from "@/lib/dates";
import { getRoomAvailability, type RoomAvailability } from "@/server/actions/rooms";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { useToast } from "@/components/ui/Toast";
import { resolveMeetingCardHref, type MeetingCardVM } from "@/lib/meetingCard";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_START = 9 * 60;
const DAY_END = 20 * 60;
const RANGE = DAY_END - DAY_START;
const TICK_HOURS = Array.from({ length: DAY_END / 60 - DAY_START / 60 + 1 }, (_, i) => DAY_START / 60 + i);
const LABEL_HOURS = [9, 11, 13, 15, 17, 19];
const BLOCK_COLORS = ["#2f6fb3", "#6b46c1", "#b8860b", "#0f7a6b", "#a83279"];
const HOUR_OPTIONS = Array.from({ length: DAY_END / 60 - DAY_START / 60 + 1 }, (_, i) => DAY_START / 60 + i);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toMinutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
function toPercent(min: number) {
  return Math.max(0, Math.min(100, ((min - DAY_START) / RANGE) * 100));
}
function formatDateField(d: Date) {
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}
function initialDayLabel(d: Date) {
  return `오늘(${d.getMonth() + 1}/${d.getDate()}, ${DOW[d.getDay()]}) 기준 · 09:00 – 20:00`;
}
function searchedDayLabel(d: Date, hour: string, minute: string, capacityNote: string) {
  const dateStr = formatDateField(d);
  if (hour !== "" && minute !== "") {
    return `${dateStr} · ${pad2(Number(hour))}:${pad2(Number(minute))} 기준 조회 결과${capacityNote}`;
  }
  return `${dateStr} 기준 · 09:00 – 20:00${capacityNote}`;
}

function getRoomStatus(room: RoomAvailability, searchMinutes: number | null, hasSearched: boolean, isToday: boolean) {
  if (searchMinutes != null) {
    const busy = room.bookings.some((b) => searchMinutes >= toMinutesOfDay(b.startTime) && searchMinutes < toMinutesOfDay(b.endTime));
    return { busy, label: `${pad2(Math.floor(searchMinutes / 60))}:${pad2(searchMinutes % 60)} 기준 ${busy ? "예약중" : "비어있음"}` };
  }
  if (!hasSearched && isToday) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const busy = room.bookings.some((b) => nowMinutes >= toMinutesOfDay(b.startTime) && nowMinutes < toMinutesOfDay(b.endTime));
    return { busy, label: busy ? "지금 예약중" : "지금 비어있음" };
  }
  const busy = room.bookings.length > 0;
  return { busy, label: busy ? "예약 있음" : "예약 가능" };
}

export function ReservationsClient({
  initialDate,
  initialRooms,
  myMeetings,
}: {
  initialDate: string;
  initialRooms: RoomAvailability[];
  myMeetings: MeetingCardVM[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"reserve" | "rooms">("reserve");

  const today = useMemo(() => startOfDay(new Date(initialDate)), [initialDate]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchHour, setSearchHour] = useState("");
  const [searchMinute, setSearchMinute] = useState("");
  const [capacityInput, setCapacityInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [appliedDate, setAppliedDate] = useState(today);
  const [roomsData, setRoomsData] = useState(initialRooms);
  const [activeSearchMinutes, setActiveSearchMinutes] = useState<number | null>(null);
  const [activeCapacity, setActiveCapacity] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  const dayLabel = hasSearched
    ? searchedDayLabel(appliedDate, activeSearchMinutes != null ? String(Math.floor(activeSearchMinutes / 60)) : "", activeSearchMinutes != null ? String(activeSearchMinutes % 60) : "", activeCapacity ? ` · 인원 ${activeCapacity}명 이상` : "")
    : initialDayLabel(appliedDate);

  const filteredRooms = activeCapacity ? roomsData.filter((r) => (r.capacity ?? 0) >= activeCapacity) : roomsData;
  const openRoom = openRoomId ? roomsData.find((r) => r.id === openRoomId) : null;

  async function handleSearch() {
    if (!selectedDate) {
      showToast("날짜를 선택해주세요");
      return;
    }
    setIsLoading(true);
    try {
      const data = await getRoomAvailability(selectedDate);
      setRoomsData(data);
      setAppliedDate(selectedDate);
      setActiveSearchMinutes(searchHour !== "" && searchMinute !== "" ? Number(searchHour) * 60 + Number(searchMinute) : null);
      setActiveCapacity(capacityInput ? Number(capacityInput) : null);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      <div className="page-header">
        <div className="page-header-top" style={{ marginBottom: 12 }}>
          <span className="page-title">예약</span>
        </div>
      </div>

      <div className="subtab-row">
        <button type="button" className={`subtab${tab === "reserve" ? " active" : ""}`} onClick={() => setTab("reserve")}>
          회의 예약
        </button>
        <button type="button" className={`subtab${tab === "rooms" ? " active" : ""}`} onClick={() => setTab("rooms")}>
          회의실 현황
        </button>
      </div>

      {tab === "reserve" ? (
        <div className="screen-scroll">
          <div className="create-cta">
            <div className="create-cta-title">새 회의를 만들어보세요</div>
            <div className="create-cta-sub">참석자와 후보 기간만 정하면 나머지는 시스템이 알아서 조율해요.</div>
            <button type="button" className="btn btn-primary" onClick={() => router.push("/meetings/new")}>
              새 회의 만들기
            </button>
          </div>

          <div className="recent-label">내가 만든 회의</div>
          {myMeetings.length === 0 && <div className="hint">아직 만든 회의가 없어요</div>}
          {myMeetings.map((m) => {
            const href = resolveMeetingCardHref(m);
            return (
              <div
                key={m.meetingId}
                className="recent-row"
                style={{ opacity: href ? 1 : 0.85, cursor: href ? "pointer" : "default" }}
                onClick={() => href && router.push(href)}
              >
                <span className="recent-title">{m.title}</span>
                <span className="recent-meta">
                  {m.confirmedStartTime && m.confirmedEndTime
                    ? `${formatMeetingDate(m.confirmedStartTime)} ${formatTimeRange(m.confirmedStartTime, m.confirmedEndTime)}`
                    : m.status}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="screen-scroll">
          <div className="room-search-row">
            <div className="date-field" onClick={() => setCalendarOpen((v) => !v)}>
              {selectedDate ? formatDateField(selectedDate) : "날짜 선택"}
            </div>
          </div>
          <div className="room-search-row last">
            <span style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <select className="room-time-select" value={searchHour} onChange={(e) => setSearchHour(e.target.value)}>
                <option value="">시</option>
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}시
                  </option>
                ))}
              </select>
              <span className="room-time-colon">:</span>
              <select className="room-time-select" value={searchMinute} onChange={(e) => setSearchMinute(e.target.value)}>
                <option value="">분</option>
                <option value="0">00분</option>
                <option value="30">30분</option>
              </select>
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="capacity-input"
              placeholder="인원 (숫자 입력)"
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value.replace(/\D/g, ""))}
            />
            <button type="button" className="room-search-btn" disabled={isLoading} onClick={handleSearch}>
              조회
            </button>
          </div>

          {calendarOpen && (
            <div className="calendar-panel">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <span
                  className="calendar-today-btn"
                  onClick={() => {
                    setSelectedDate(today);
                    setCalendarOpen(false);
                  }}
                >
                  오늘
                </span>
              </div>
              <CalendarPicker
                mode="single"
                minDate={today}
                value={selectedDate}
                onChangeSingle={(d) => {
                  setSelectedDate(d);
                  setCalendarOpen(false);
                }}
              />
              <div className="calendar-footer-actions">
                <span className="calendar-footer-btn clear" onClick={() => setSelectedDate(null)}>
                  삭제
                </span>
                <span className="calendar-footer-btn confirm" onClick={() => setCalendarOpen(false)}>
                  선택
                </span>
              </div>
            </div>
          )}

          <div className="room-day-label">{dayLabel}</div>

          {filteredRooms.length === 0 && <div className="room-detail-empty">조건에 맞는 회의실이 없어요</div>}
          {filteredRooms.map((room) => {
            const status = getRoomStatus(room, activeSearchMinutes, hasSearched, isSameDay(appliedDate, today));
            return (
              <div key={room.id} className="room-card" onClick={() => setOpenRoomId(room.id)}>
                <div className="room-card-top">
                  <div>
                    <div className="room-name">{room.name}</div>
                    <div className="room-meta">
                      {room.location} · 수용 {room.capacity}명 {room.equipment ? `· ${room.equipment}` : ""}
                    </div>
                  </div>
                  <span className={`room-status ${status.busy ? "busy" : "free"}`}>{status.label}</span>
                </div>
                <div className="room-timeline">
                  <div className="timeline-track">
                    {TICK_HOURS.map((h) => (
                      <div key={h} className="timeline-tick" style={{ left: `${toPercent(h * 60)}%` }} />
                    ))}
                    {room.bookings.map((b, i) => {
                      const left = toPercent(toMinutesOfDay(b.startTime));
                      const width = toPercent(toMinutesOfDay(b.endTime)) - left;
                      return (
                        <div
                          key={b.id}
                          className="timeline-block"
                          style={{ left: `${left}%`, width: `${width}%`, background: BLOCK_COLORS[i % BLOCK_COLORS.length] }}
                        />
                      );
                    })}
                  </div>
                  <div className="timeline-hours">
                    {LABEL_HOURS.map((h) => {
                      const pct = toPercent(h * 60);
                      const transform = pct === 0 ? "none" : pct === 100 ? "translateX(-100%)" : "translateX(-50%)";
                      return (
                        <span key={h} style={{ left: `${pct}%`, transform }}>
                          {pad2(h)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openRoom && (
        <div className="room-detail-modal">
          <div className="room-detail-header">
            <span className="room-detail-title">{openRoom.name}</span>
            <button type="button" className="room-detail-close" onClick={() => setOpenRoomId(null)} aria-label="닫기">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="room-detail-body">
            <div className="room-detail-info-label">회의실 상세정보</div>
            <div className="room-detail-info-row">
              <span className="info-label">위치</span>
              <span className="info-value">{openRoom.location ?? "-"}</span>
            </div>
            <div className="room-detail-info-row">
              <span className="info-label">수용 인원</span>
              <span className="info-value">{openRoom.capacity != null ? `${openRoom.capacity}명` : "-"}</span>
            </div>
            <div className="room-detail-info-row">
              <span className="info-label">보유 장비</span>
              <span className="info-value">{openRoom.equipment ?? "-"}</span>
            </div>
            <div className="room-detail-info-row">
              <span className="info-label">특이사항</span>
              <span className="info-value">{openRoom.notes ?? "-"}</span>
            </div>

            <div className="room-detail-list-label">{hasSearched ? "예약 현황" : "오늘 예약 현황"}</div>
            {openRoom.bookings.length === 0 ? (
              <div className="room-detail-empty">예약된 일정이 없어요</div>
            ) : (
              openRoom.bookings.map((b, i) => (
                <div key={b.id} className="room-booking-row">
                  <span className="room-booking-swatch" style={{ background: BLOCK_COLORS[i % BLOCK_COLORS.length] }} />
                  <span className="room-booking-time">{formatTimeRange(b.startTime, b.endTime)}</span>
                  <div className="room-booking-info">
                    <div className="room-booking-title">{b.meetingTitle}</div>
                    <div className="room-booking-reserver">
                      주최자 : {b.organizerRank ?? ""} {b.organizerName} (총 참석인원 : {b.attendeeCount}명)
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
