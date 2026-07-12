"use client";

import { useState } from "react";
import { getMonthGrid, isSameDay, startOfDay } from "@/lib/dates";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

type RangeValue = { start: Date | null; end: Date | null };

/** 화면2/10/17 공용 커스텀 캘린더 — 단일 선택(mode="single") 또는 범위 선택(mode="range") */
export function CalendarPicker(props: {
  mode: "single" | "range";
  minDate: Date;
  value: Date | null | RangeValue;
  onChangeSingle?: (date: Date) => void;
  onChangeRange?: (range: RangeValue) => void;
}) {
  const min = startOfDay(props.minDate);
  const [viewDate, setViewDate] = useState(() => {
    const base =
      props.mode === "single"
        ? (props.value as Date | null)
        : (props.value as RangeValue).start ?? (props.value as RangeValue).end;
    return base ?? min;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = getMonthGrid(year, month);

  const canGoPrev = new Date(year, month, 1).getTime() > new Date(min.getFullYear(), min.getMonth(), 1).getTime();

  function isDisabled(d: Date) {
    return d.getTime() < min.getTime();
  }

  function handleClick(d: Date) {
    if (isDisabled(d)) return;
    if (props.mode === "single") {
      props.onChangeSingle?.(d);
      return;
    }
    const range = props.value as RangeValue;
    if (!range.start || (range.start && range.end)) {
      props.onChangeRange?.({ start: d, end: null });
      return;
    }
    if (d.getTime() < range.start.getTime()) {
      props.onChangeRange?.({ start: d, end: range.start });
    } else {
      props.onChangeRange?.({ start: range.start, end: d });
    }
  }

  function cellState(d: Date): { selected: boolean; inRange: boolean } {
    if (props.mode === "single") {
      return { selected: props.value ? isSameDay(d, props.value as Date) : false, inRange: false };
    }
    const range = props.value as RangeValue;
    const selected = Boolean((range.start && isSameDay(d, range.start)) || (range.end && isSameDay(d, range.end)));
    const inRange = Boolean(
      range.start && range.end && d.getTime() > range.start.getTime() && d.getTime() < range.end.getTime()
    );
    return { selected, inRange };
  }

  return (
    <div className="calendar-wrap">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-btn"
          disabled={!canGoPrev}
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="calendar-month-label">
          {year}년 {month + 1}월
        </span>
        <button type="button" className="calendar-nav-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {DOW.map((d) => (
          <div key={d} className="calendar-dow">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="calendar-day empty" />;
          const disabled = isDisabled(d);
          const { selected, inRange } = cellState(d);
          const isToday = isSameDay(d, new Date());
          return (
            <button
              key={i}
              type="button"
              className={`calendar-day${disabled ? " disabled" : ""}${selected ? " selected" : ""}${inRange ? " in-range" : ""}${isToday ? " today" : ""}`}
              disabled={disabled}
              onClick={() => handleClick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
