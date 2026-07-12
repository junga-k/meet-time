import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

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
