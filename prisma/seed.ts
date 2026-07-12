import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { addBusinessDays, addDays, startOfDay } from "../src/lib/dates";
import { generateTimeSlotInputs } from "../src/lib/scheduling";

const TEMP_PASSWORD = "1111";

const USERS = [
  { name: "김민준", email: "kim.minjun@company.com", department: "기획팀", rank: "과장", position: "팀장" },
  { name: "박서연", email: "park.seoyeon@company.com", department: "기획팀", rank: "대리", position: null },
  { name: "이지훈", email: "lee.jihoon@company.com", department: "개발팀", rank: "사원", position: null },
  { name: "최유나", email: "choi.yuna@company.com", department: "개발팀", rank: "대리", position: null },
  { name: "정다은", email: "jeong.daeun@company.com", department: "디자인팀", rank: "사원", position: null },
  { name: "한소희", email: "han.sohee@company.com", department: "마케팅팀", rank: "사원", position: null },
] as const;

const ROOMS = [
  { name: "회의실 A", location: "3층", capacity: 4, equipment: "모니터", notes: null },
  { name: "회의실 B", location: "3층", capacity: 6, equipment: "모니터, 화이트보드", notes: "화이트보드 있음" },
  { name: "회의실 C", location: "5층", capacity: 10, equipment: "화상회의 장비, 모니터", notes: null },
  { name: "대회의실", location: "5층", capacity: 12, equipment: "화상회의 장비, 프로젝터", notes: "임원 회의 우선 예약" },
] as const;

// 데모 계정(김민준)이 "전체 서비스"를 둘러볼 수 있도록 주최자/필수/선택 역할을 골고루 겪는 회의 6건을 시딩한다.
// 제목으로 존재 여부를 확인해 재시드해도 중복 생성되지 않는다.
const DEMO_ORGANIZER_EMAIL = "kim.minjun@company.com";

async function seedDemoMeetings(userByEmail: Record<string, { id: string; name: string; rank: string | null }>, roomByName: Record<string, { id: string }>) {
  const existingTitles = new Set((await prisma.meeting.findMany({ select: { title: true } })).map((m) => m.title));
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
    if (!existingTitles.has(title)) {
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
  }

  // M2 — 김민준이 필수참석자(주최자는 정다은), 아직 응답 안 함 → 화면3(필수응답, 참석자 관점)
  {
    const title = "디자인 시스템 검토";
    if (!existingTitles.has(title)) {
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
  }

  // M3 — 김민준이 선택참석자(주최자는 한소희), 필수참석자 응답은 이미 끝나 선택확인중 단계 → 화면12(선택확인)
  {
    const title = "마케팅 캠페인 아이디어 회의";
    if (!existingTitles.has(title)) {
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
  }

  // M4 — 김민준이 주최자, 확정됐지만 김민준 본인은 아직 참석 재확인 전 → 목록에 "재확인 대기" 배지, 화면8로 이동
  {
    const title = "신규 입사자 온보딩 계획";
    if (!existingTitles.has(title)) {
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
  }

  // M5 — 김민준이 필수참석자(주최자는 최유나), 확정+재확인 완료+회의록까지 등록됨 → 목록에 "회의록" 배지, 화면9로 이동
  {
    const title = "UX 리서치 결과 공유";
    if (!existingTitles.has(title)) {
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
  }

  // M6 — 김민준이 선택참석자(주최자는 박서연), 이미 지난 회의(종료) → 목록 "종료" 필터에서 확인
  {
    const title = "팀 워크샵 기획";
    if (!existingTitles.has(title)) {
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
}

async function main() {
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        department: u.department,
        rank: u.rank,
        position: u.position ?? undefined,
      },
    });
  }

  for (const r of ROOMS) {
    const existing = await prisma.room.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.room.create({
        data: {
          name: r.name,
          location: r.location,
          capacity: r.capacity,
          equipment: r.equipment,
          notes: r.notes ?? undefined,
        },
      });
    }
  }

  const userByEmail = Object.fromEntries((await prisma.user.findMany()).map((u) => [u.email, u]));
  const roomByName = Object.fromEntries((await prisma.room.findMany()).map((r) => [r.name, r]));
  await seedDemoMeetings(userByEmail, roomByName);

  console.log("\n=== 시드 완료 ===");
  console.log("아래 계정으로 로그인하세요 (임시 비밀번호 전원 동일, 자세한 내용은 TEST_ACCOUNTS.md 참고)\n");
  for (const u of USERS) {
    console.log(`  ${u.name.padEnd(4, " ")} | ${u.email.padEnd(28, " ")} | 임시비밀번호: ${TEMP_PASSWORD}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
