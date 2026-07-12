"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingSeenAction } from "@/server/actions/auth";

const AUTOPLAY_DELAY_MS = 4000;
const SWIPE_THRESHOLD_PX = 40;

const SLIDES = [
  {
    title: "복잡한 회의시간 정하기,\n사람들 대신 자동으로 찾아드려요",
    body: "참석자들의 가능한 시간과 참석 방식을 모으면,\n모두에게 괜찮은 시간을 시스템이 알아서 찾아줘요.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    title: "필수 참석자 먼저,\n선택 참석자는 나중에",
    body: "필수참석자에게 먼저 가능한 일정을 확인해요.\n선택참석자는 추려진 후보 일정 중\n부담없이 선택하면 돼요.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    title: "회의실 예약까지 진행해요",
    body: "회의 일정이 확정되면\n회의실 예약도 함께 진행해요.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.8" />
        <path d="M4.5 20c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" />
      </svg>
    ),
  },
  {
    title: "준비됐어요!",
    body: "회의 관련 사항은 알림으로 바로 알려드릴게요.\n이제 첫 회의를 만들거나, 초대받은 회의에 응답해보세요.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10.5a6 6 0 1112 0c0 4.2 1.5 5.5 1.5 5.5h-15S6 14.7 6 10.5z" />
        <path d="M9.7 18.5a2.3 2.3 0 004.6 0" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isLast = index === SLIDES.length - 1;

  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartXRef = useRef<number | null>(null);

  function stopAutoplay() {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }

  // 일정 시간(4초)마다 자동으로 다음 슬라이드로 넘어감 — 마지막 슬라이드에 도달하면 멈춤.
  // 사용자가 버튼/점/드래그로 직접 조작하면 그 시점부터 자동재생은 멈춤(wireframe_14 dev-notes 기준)
  useEffect(() => {
    autoplayTimerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i < SLIDES.length - 1) return i + 1;
        stopAutoplay();
        return i;
      });
    }, AUTOPLAY_DELAY_MS);
    return stopAutoplay;
  }, []);

  function goTo(idx: number) {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, idx)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragStartXRef.current = e.clientX;
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartXRef.current === null) return;
    const deltaX = e.clientX - dragStartXRef.current;
    dragStartXRef.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    stopAutoplay();
    setIndex((i) => Math.max(0, Math.min(SLIDES.length - 1, deltaX < 0 ? i + 1 : i - 1)));
  }
  function handlePointerCancel() {
    dragStartXRef.current = null;
  }

  function finish() {
    stopAutoplay();
    startTransition(async () => {
      const result = await markOnboardingSeenAction();
      if (result.ok) router.push(result.redirectTo);
    });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 16px 0" }}>
        <button
          type="button"
          onClick={finish}
          disabled={isPending}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          건너뛰기
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 28px",
          textAlign: "center",
          touchAction: "pan-y",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            border: "1.5px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          {SLIDES[index].icon}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 10, whiteSpace: "pre-line" }}>
          {SLIDES[index].title}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-line", maxWidth: 280 }}>
          {SLIDES[index].body}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "14px 0" }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}번째 슬라이드로 이동`}
            onClick={() => {
              stopAutoplay();
              goTo(i);
            }}
            style={{
              width: i === index ? 16 : 6,
              height: 6,
              borderRadius: i === index ? 4 : "50%",
              background: i === index ? "var(--ink)" : "var(--border-light)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "width 0.15s ease",
            }}
          />
        ))}
      </div>

      <div className="footer">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isPending}
          onClick={() => {
            stopAutoplay();
            if (isLast) {
              finish();
            } else {
              setIndex((i) => i + 1);
            }
          }}
        >
          {isPending ? "이동 중..." : isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
