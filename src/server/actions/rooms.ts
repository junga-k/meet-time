"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, addDays } from "@/lib/dates";

export type RoomAvailability = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  equipment: string | null;
  notes: string | null;
  bookings: {
    id: string;
    startTime: Date;
    endTime: Date;
    meetingTitle: string;
    organizerRank: string | null;
    organizerName: string;
    attendeeCount: number;
  }[];
};

/** 선택한 날짜(00:00~24:00) 기준 회의실별 확정 예약 현황 — 화면17 회의실 현황판 초기 로드/조회 액션 공용 */
export async function getRoomAvailability(date: Date): Promise<RoomAvailability[]> {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);

  const rooms = await prisma.room.findMany({
    orderBy: { capacity: "asc" },
    include: {
      bookings: {
        where: { status: "확정", startTime: { lt: dayEnd }, endTime: { gt: dayStart } },
        orderBy: { startTime: "asc" },
        include: { meeting: { include: { organizer: true, participants: true } } },
      },
    },
  });

  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location,
    capacity: r.capacity,
    equipment: r.equipment,
    notes: r.notes,
    bookings: r.bookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      meetingTitle: b.meeting.title,
      organizerRank: b.meeting.organizer.rank,
      organizerName: b.meeting.organizer.name,
      attendeeCount: b.meeting.participants.length,
    })),
  }));
}

export type MyRoomReservation = {
  meetingId: string;
  meetingTitle: string;
  roomId: string;
  roomName: string;
  startTime: Date;
  endTime: Date;
};

/**
 * 로그인한 사용자가 (역할 무관, 주최자/필수/선택 전부) 참여 중인 확정 회의 중 회의실이 예약된 건만 모아
 * "예약" 탭 · 회의실 현황판에서 "내 회의" 목록과 대조해 바로 확인할 수 있게 한다.
 */
export async function getMyRoomReservations(userId: string): Promise<MyRoomReservation[]> {
  const participants = await prisma.participant.findMany({
    where: {
      userId,
      meeting: { status: "확정", roomBooking: { isNot: null } },
    },
    include: {
      meeting: { include: { roomBooking: { include: { room: true } } } },
    },
  });

  return participants
    .filter((p) => p.meeting.roomBooking)
    .map((p) => ({
      meetingId: p.meeting.id,
      meetingTitle: p.meeting.title,
      roomId: p.meeting.roomBooking!.roomId,
      roomName: p.meeting.roomBooking!.room.name,
      startTime: p.meeting.roomBooking!.startTime,
      endTime: p.meeting.roomBooking!.endTime,
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
