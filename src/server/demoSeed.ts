import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addBusinessDays, addDays, startOfDay } from "@/lib/dates";
import { generateTimeSlotInputs } from "@/lib/scheduling";

/** 이 시간 이상 데모 계정에 아무 요청도 없었다면 다음 요청에서 자동으로 리셋한다. */
const DEMO_IDLE_RESET_MINUTES = 10;

/**
 * 데모 계정(김민준)이 "전체 서비스"를 둘러볼 수 있도록 주최자/필수/선택 역할을 골고루 겪는
 * 회의 6건 + 예시 알림 8건을 시딩한다. `npm run seed`(최초 시딩)와 `demoLoginAction`(데모
 * 로그인 시마다), `logoutAction`(데모 계정 로그아웃 시) 세 군데에서 재사용 — 데모 계정은
 * 실제 DB row를 여러 리뷰어가 순서대로 공유하는 구조라, 매번 이 6개 회의 + 프로필(사진·
 * 연락처·비밀번호) + 데모 세션 중 새로 만든 회의까지 전부 삭제/초기화해서 다음 사람이
 * 이전 사람의 흔적을 보지 않도록 한다.
 */
export const DEMO_ORGANIZER_EMAIL = "kim.minjun@company.com";
const DEMO_TEMP_PASSWORD = "1111";

const DEMO_PARTICIPANT_EMAILS = [
  DEMO_ORGANIZER_EMAIL,
  "park.seoyeon@company.com",
  "lee.jihoon@company.com",
  "choi.yuna@company.com",
  "jeong.daeun@company.com",
  "han.sohee@company.com",
];

const DEMO_ROOM_NAMES = ["회의실 A", "회의실 B", "대회의실"];

const DEMO_MEETING_TITLES = [
  "3분기 로드맵 킥오프",
  "디자인 시스템 검토",
  "마케팅 캠페인 아이디어 회의",
  "신규 입사자 온보딩 계획",
  "UX 리서치 결과 공유",
  "팀 워크샵 기획",
];

type DemoUser = { id: string; name: string; rank: string | null };
type DemoRoom = { id: string };

export async function resetDemoAccountData(): Promise<void> {
  const users = await prisma.user.findMany({ where: { email: { in: DEMO_PARTICIPANT_EMAILS } } });
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u])) as Record<string, DemoUser>;
  const kim = userByEmail[DEMO_ORGANIZER_EMAIL];
  if (!kim) return; // 시드가 아직 안 된 DB — 초기 seed.ts가 처리하므로 여기선 스킵

  const rooms = await prisma.room.findMany({ where: { name: { in: DEMO_ROOM_NAMES } } });
  const roomByName = Object.fromEntries(rooms.map((r) => [r.name, r])) as Record<string, DemoRoom>;

  await resetDemoProfileFields(kim.id);
  await deleteAdHocMeetingsOrganizedBy(kim.id);
  await deleteDemoMeetings();
  await createDemoMeetings(userByEmail, roomByName);
  await prisma.notification.deleteMany({ where: { userId: kim.id } });
  await createDemoNotifications(kim.id);
}

/** 프로필 사진·연락처·비밀번호 등 데모 세션 중 직접 바꿀 수 있는 계정 필드를 전부 초기값으로 되돌린다. */
async function resetDemoProfileFields(kimId: string) {
  const passwordHash = await bcrypt.hash(DEMO_TEMP_PASSWORD, 10);
  await prisma.user.update({
    where: { id: kimId },
    data: {
      phone: null,
      onboardingSeenAt: null,
      extension: null,
      messengerId: null,
      profileImageUrl: null,
      passwordHash,
      lastActiveAt: new Date(),
    },
  });
}

/**
 * 로그아웃하지 않고 브라우저/세션 쿠키가 그대로 남아있는 경우까지 대비한 자동 리셋.
 * 인증이 필요한 화면에 진입할 때마다(getCurrentUser 경유) 호출되며, 데모 계정의 마지막
 * 활동 이후 DEMO_IDLE_RESET_MINUTES 이상 조용했으면 "사용자가 바뀐 것"으로 간주해 이 요청이
 * 응답을 만들기 전에 먼저 리셋한다. 그 안에 계속 활동이 있었다면 lastActiveAt만 갱신한다.
 */
export async function ensureDemoAccountFresh(user: User): Promise<User> {
  const now = new Date();
  const idleMs = user.lastActiveAt ? now.getTime() - user.lastActiveAt.getTime() : Infinity;

  if (idleMs > DEMO_IDLE_RESET_MINUTES * 60_000) {
    await resetDemoAccountData();
    return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  return prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: now } });
}

/** 데모 세션 중 "새 회의 만들기"로 직접 만든, 6개 시딩 회의에 속하지 않는 회의를 전부 지운다. */
async function deleteAdHocMeetingsOrganizedBy(kimId: string) {
  const meetings = await prisma.meeting.findMany({
    where: { organizerId: kimId, title: { notIn: DEMO_MEETING_TITLES } },
    select: { id: true },
  });
  await deleteMeetingsByIds(meetings.map((m) => m.id));
}

/** FK 제약 순서에 맞춰 데모 회의 6건과 그에 딸린 하위 레코드를 전부 지운다(존재하면). */
async function deleteDemoMeetings() {
  const meetings = await prisma.meeting.findMany({ where: { title: { in: DEMO_MEETING_TITLES } }, select: { id: true } });
  await deleteMeetingsByIds(meetings.map((m) => m.id));
}

/** FK 제약 순서에 맞춰 주어진 회의 ID들과 그에 딸린 하위 레코드를 전부 지운다. */
async function deleteMeetingsByIds(ids: string[]) {
  if (ids.length === 0) return;

  await prisma.meeting.updateMany({ where: { id: { in: ids } }, data: { confirmedSlotId: null } });
  await prisma.slotResponse.deleteMany({ where: { timeSlot: { meetingId: { in: ids } } } });
  await prisma.mitigationRequest.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.actionItem.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.agenda.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.roomBooking.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.meetingNote.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.timeSlot.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.participant.deleteMany({ where: { meetingId: { in: ids } } });
  await prisma.meeting.deleteMany({ where: { id: { in: ids } } });
}

async function createDemoMeetings(userByEmail: Record<string, DemoUser>, roomByName: Record<string, DemoRoom>) {
  const now = new Date();
  const u = (email: string) => userByEmail[email];
  const kim = u(DEMO_ORGANIZER_EMAIL);

  async function agendaDeadlineFor(candidateStartDate: Date) {
    const d = addDays(candidateStartDate, -1);
    d.setHours(18, 0, 0, 0);
    return d;
  }

  // M1 — 김민준이 주최자, 아직 아무도 응답 안 함 → 목록에서 화면3(필수응답)으로 이동 (주최자 관점)
  {
    const title = "3분기 로드맵 킥오프";
    const candidateStartDate = startOfDay(addBusinessDays(now, 4));
    const candidateEndDate = addDays(candidateStartDate, 4);
    const slots = generateTimeSlotInputs(candidateStartDate, candidateEndDate, 60);
    await prisma.meeting.create({
      data: {
        title,
        status: "제안중",
        stage: "필수응답중",
        organizerId: kim.id,
        durationMinutes: 60,
        createdAt: now,
        candidateStartDate,
        candidateEndDate,
        requiredResponseDeadline: addBusinessDays(now, 1),
        optionalResponseDeadline: addBusinessDays(now, 2),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: { create: slots },
        participants: {
          create: [
            { userId: kim.id, role: "주최자" },
            { userId: u("park.seoyeon@company.com").id, role: "필수" },
            { userId: u("lee.jihoon@company.com").id, role: "필수" },
            { userId: u("choi.yuna@company.com").id, role: "선택" },
          ],
        },
      },
    });
  }

  // M2 — 김민준이 필수참석자(주최자는 정다은), 아직 응답 안 함 → 화면3(필수응답, 참석자 관점)
  {
    const title = "디자인 시스템 검토";
    const candidateStartDate = startOfDay(addBusinessDays(now, 5));
    const candidateEndDate = addDays(candidateStartDate, 3);
    const slots = generateTimeSlotInputs(candidateStartDate, candidateEndDate, 60);
    const organizer = u("jeong.daeun@company.com");
    await prisma.meeting.create({
      data: {
        title,
        status: "제안중",
        stage: "필수응답중",
        organizerId: organizer.id,
        durationMinutes: 60,
        createdAt: now,
        candidateStartDate,
        candidateEndDate,
        requiredResponseDeadline: addBusinessDays(now, 1),
        optionalResponseDeadline: addBusinessDays(now, 2),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: { create: slots },
        participants: {
          create: [
            { userId: organizer.id, role: "주최자" },
            { userId: kim.id, role: "필수" },
            { userId: u("lee.jihoon@company.com").id, role: "필수" },
            { userId: u("han.sohee@company.com").id, role: "선택" },
          ],
        },
      },
    });
  }

  // M3 — 김민준이 선택참석자(주최자는 한소희), 필수참석자 응답은 이미 끝나 선택확인중 단계 → 화면12(선택확인)
  {
    const title = "마케팅 캠페인 아이디어 회의";
    const candidateStartDate = startOfDay(addBusinessDays(now, 4));
    const candidateEndDate = addDays(candidateStartDate, 4);
    const slots = generateTimeSlotInputs(candidateStartDate, candidateEndDate, 60);
    const organizer = u("han.sohee@company.com");
    const required = [organizer, u("park.seoyeon@company.com"), u("choi.yuna@company.com")];
    const shortlisted = slots.filter((_, i) => i % Math.max(1, Math.floor(slots.length / 5)) === 0).slice(0, 5);

    const meeting = await prisma.meeting.create({
      data: {
        title,
        status: "제안중",
        stage: "선택확인중",
        mode: "오프라인",
        organizerId: organizer.id,
        durationMinutes: 60,
        createdAt: now,
        candidateStartDate,
        candidateEndDate,
        requiredResponseDeadline: addBusinessDays(now, 1),
        optionalResponseDeadline: addBusinessDays(now, 2),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: {
          create: slots.map((s) => ({ ...s, isShortlisted: shortlisted.includes(s) })),
        },
        participants: {
          create: [
            { userId: organizer.id, role: "주최자", respondedAt: now },
            { userId: u("park.seoyeon@company.com").id, role: "필수", respondedAt: now },
            { userId: u("choi.yuna@company.com").id, role: "필수", respondedAt: now },
            { userId: kim.id, role: "선택" },
          ],
        },
      },
      include: { timeSlots: true },
    });

    const shortlistedRows = meeting.timeSlots.filter((s) => s.isShortlisted);
    for (const responder of required) {
      for (const slot of shortlistedRows) {
        await prisma.slotResponse.create({
          data: { timeSlotId: slot.id, userId: responder.id, status: "가능" },
        });
      }
    }
  }

  // M4 — 김민준이 주최자, 확정됐지만 김민준 본인은 아직 참석 재확인 전 → 목록에 "재확인 대기" 배지, 화면8로 이동
  {
    const title = "신규 입사자 온보딩 계획";
    const candidateStartDate = startOfDay(addBusinessDays(now, 6));
    const confirmedStart = new Date(candidateStartDate);
    confirmedStart.setHours(14, 0, 0, 0);
    const confirmedEnd = new Date(confirmedStart.getTime() + 60 * 60_000);
    const room = roomByName["회의실 A"];

    const meeting = await prisma.meeting.create({
      data: {
        title,
        status: "확정",
        stage: "확정",
        mode: "오프라인",
        organizerId: kim.id,
        durationMinutes: 60,
        createdAt: now,
        candidateStartDate,
        candidateEndDate: addDays(candidateStartDate, 4),
        requiredResponseDeadline: addBusinessDays(now, 1),
        optionalResponseDeadline: addBusinessDays(now, 2),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: { create: [{ startTime: confirmedStart, endTime: confirmedEnd }] },
        participants: {
          create: [
            { userId: kim.id, role: "주최자", respondedAt: now, confirmationStatus: "확정" },
            { userId: u("lee.jihoon@company.com").id, role: "필수", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
            { userId: u("choi.yuna@company.com").id, role: "필수", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
            { userId: u("park.seoyeon@company.com").id, role: "선택", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
          ],
        },
      },
      include: { timeSlots: true },
    });

    await prisma.meeting.update({ where: { id: meeting.id }, data: { confirmedSlotId: meeting.timeSlots[0].id } });
    await prisma.roomBooking.create({
      data: { meetingId: meeting.id, roomId: room.id, startTime: confirmedStart, endTime: confirmedEnd, status: "확정" },
    });
  }

  // M5 — 김민준이 필수참석자(주최자는 최유나), 확정+재확인 완료+회의록까지 등록됨 → 목록에 "회의록" 배지, 화면9로 이동
  {
    const title = "UX 리서치 결과 공유";
    const candidateStartDate = startOfDay(addBusinessDays(now, 3));
    const confirmedStart = new Date(candidateStartDate);
    confirmedStart.setHours(11, 0, 0, 0);
    const confirmedEnd = new Date(confirmedStart.getTime() + 60 * 60_000);
    const room = roomByName["회의실 B"];
    const organizer = u("choi.yuna@company.com");

    const meeting = await prisma.meeting.create({
      data: {
        title,
        status: "확정",
        stage: "확정",
        mode: "오프라인",
        organizerId: organizer.id,
        durationMinutes: 60,
        createdAt: now,
        candidateStartDate,
        candidateEndDate: addDays(candidateStartDate, 4),
        requiredResponseDeadline: addBusinessDays(now, 1),
        optionalResponseDeadline: addBusinessDays(now, 2),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: { create: [{ startTime: confirmedStart, endTime: confirmedEnd }] },
        participants: {
          create: [
            { userId: organizer.id, role: "주최자", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
            { userId: kim.id, role: "필수", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
            { userId: u("jeong.daeun@company.com").id, role: "필수", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
            { userId: u("han.sohee@company.com").id, role: "선택", respondedAt: now, confirmationStatus: "확정", reconfirmedAt: now },
          ],
        },
      },
      include: { timeSlots: true },
    });

    await prisma.meeting.update({ where: { id: meeting.id }, data: { confirmedSlotId: meeting.timeSlots[0].id } });
    await prisma.roomBooking.create({
      data: { meetingId: meeting.id, roomId: room.id, startTime: confirmedStart, endTime: confirmedEnd, status: "확정" },
    });
    await prisma.meetingNote.create({
      data: {
        meetingId: meeting.id,
        content: "리서치 참여자 12명 인터뷰 결과 공유. 온보딩 플로우에서 이탈이 가장 큰 지점은 참석형태 선택 단계였음 — 다음 스프린트에서 기본값(대면) 적용 여부 논의.",
        authorUserId: organizer.id,
        isAiGenerated: false,
        status: "등록",
        registeredAt: now,
      },
    });
  }

  // M6 — 김민준이 선택참석자(주최자는 박서연), 이미 지난 회의(종료) → 목록 "종료" 필터에서 확인
  {
    const title = "팀 워크샵 기획";
    const candidateStartDate = startOfDay(addDays(now, -10));
    const confirmedStart = new Date(candidateStartDate);
    confirmedStart.setHours(15, 0, 0, 0);
    const confirmedEnd = new Date(confirmedStart.getTime() + 60 * 60_000);
    const room = roomByName["대회의실"];
    const organizer = u("park.seoyeon@company.com");
    const pastCreatedAt = addDays(now, -18);

    const meeting = await prisma.meeting.create({
      data: {
        title,
        status: "확정",
        stage: "확정",
        mode: "오프라인",
        organizerId: organizer.id,
        durationMinutes: 60,
        createdAt: pastCreatedAt,
        candidateStartDate,
        candidateEndDate: addDays(candidateStartDate, 4),
        requiredResponseDeadline: addDays(pastCreatedAt, 3),
        optionalResponseDeadline: addDays(pastCreatedAt, 5),
        agendaDeadline: await agendaDeadlineFor(candidateStartDate),
        timeSlots: { create: [{ startTime: confirmedStart, endTime: confirmedEnd }] },
        participants: {
          create: [
            { userId: organizer.id, role: "주최자", respondedAt: pastCreatedAt, confirmationStatus: "확정", reconfirmedAt: pastCreatedAt },
            { userId: u("choi.yuna@company.com").id, role: "필수", respondedAt: pastCreatedAt, confirmationStatus: "확정", reconfirmedAt: pastCreatedAt },
            { userId: u("han.sohee@company.com").id, role: "필수", respondedAt: pastCreatedAt, confirmationStatus: "확정", reconfirmedAt: pastCreatedAt },
            { userId: kim.id, role: "선택", respondedAt: pastCreatedAt, confirmationStatus: "확정", reconfirmedAt: pastCreatedAt },
          ],
        },
      },
      include: { timeSlots: true },
    });

    await prisma.meeting.update({ where: { id: meeting.id }, data: { confirmedSlotId: meeting.timeSlots[0].id } });
    await prisma.roomBooking.create({
      data: { meetingId: meeting.id, roomId: room.id, startTime: confirmedStart, endTime: confirmedEnd, status: "확정" },
    });
  }
}

async function createDemoNotifications(kimId: string) {
  const meetingsByTitle = Object.fromEntries(
    (await prisma.meeting.findMany({ where: { title: { in: DEMO_MEETING_TITLES } }, select: { id: true, title: true } })).map((m) => [m.title, m.id])
  );
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60_000);

  const items: { title: string; type: string; message: string; createdAt: Date; isRead: boolean }[] = [
    {
      title: "3분기 로드맵 킥오프",
      type: "안건등록",
      message: "이지훈님이 안건을 등록했어요: 'Q3 목표 초안 리뷰'",
      createdAt: hoursAgo(0.2),
      isRead: false,
    },
    {
      title: "디자인 시스템 검토",
      type: "응답요청",
      message: "'디자인 시스템 검토' 회의의 필수 응답을 기다리고 있어요",
      createdAt: hoursAgo(2),
      isRead: false,
    },
    {
      title: "마케팅 캠페인 아이디어 회의",
      type: "응답요청",
      message: "'마케팅 캠페인 아이디어 회의' 후보 시간이 좁혀졌어요. 참석 가능 여부를 알려주세요",
      createdAt: hoursAgo(5),
      isRead: false,
    },
    {
      title: "신규 입사자 온보딩 계획",
      type: "시간확정",
      message: "'신규 입사자 온보딩 계획' 회의 시간이 확정됐어요",
      createdAt: hoursAgo(24),
      isRead: true,
    },
    {
      title: "신규 입사자 온보딩 계획",
      type: "참석재확인",
      message: "'신규 입사자 온보딩 계획' 확정된 일정에 대한 참석 여부를 재확인해주세요",
      createdAt: hoursAgo(23.9),
      isRead: false,
    },
    {
      title: "신규 입사자 온보딩 계획",
      type: "회의실확정",
      message: "'신규 입사자 온보딩 계획' 회의실이 '회의실 A'(으)로 확정됐어요",
      createdAt: hoursAgo(23.8),
      isRead: true,
    },
    {
      title: "UX 리서치 결과 공유",
      type: "회의록등록",
      message: "'UX 리서치 결과 공유' 회의록이 등록됐어요",
      createdAt: hoursAgo(48),
      isRead: true,
    },
    {
      title: "팀 워크샵 기획",
      type: "시간확정",
      message: "'팀 워크샵 기획' 회의 시간이 확정됐어요",
      createdAt: hoursAgo(24 * 18),
      isRead: true,
    },
  ];

  for (const item of items) {
    const meetingId = meetingsByTitle[item.title];
    if (!meetingId) continue;
    await prisma.notification.create({
      data: {
        userId: kimId,
        meetingId,
        type: item.type,
        message: item.message,
        createdAt: item.createdAt,
        isRead: item.isRead,
      },
    });
  }
}
