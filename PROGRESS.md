# 진행 상황 (이어서 작업하기 위한 체크포인트)

> 이 파일은 세션이 끊기거나 나중에 이어서 작업할 때 "지금까지 뭘 했고 뭐가 남았는지" 바로 파악하기 위한 문서입니다. 원본 계획 전문은 `/Users/idonghun/.claude/plans/valiant-stargazing-pumpkin.md`에 있고, 설계 스펙 원본은 `meeting-scheduler-handoff/` 폴더에 있습니다.

## 상태: 17개 화면 구현 완료 + Vercel/Turso 배포 완료 + 실사용 피드백 다수 반영 (2026-07-13 기준)

> 최신 진행 상황은 아래 "후속 작업 2"(2026-07-12 밤 ~ 07-13)를 먼저 확인하세요. 배포 URL: `https://meet-time-seven.vercel.app`

10개 작업 전부 완료 후, **와이어프레임 파일들을 다시 하나씩 읽고 실제 CSS 값(색상/여백/모서리/타이포그래피/컴포넌트 패턴)에 맞춰 전 화면 재작업 완료**(추가 작업 6건, 아래 "와이어프레임 정밀 대조" 참고). `npx tsc --noEmit`, `npx eslint src`, `npx next build` 모두 통과. 핵심 플로우(회의 생성→필수응답→자동 압축/모드계산→선택응답→자동 확정/회의실매칭/화상링크생성→참석재확인→상세→알림→비밀번호변경→예약현황)를 브라우저로 실제로 클릭해가며 end-to-end 검증 완료.

### 와이어프레임 정밀 대조 (추가 작업)

처음 구현 때는 각 화면을 "설계 스펙(기능/로직)"에 맞춰 만들고 디자인은 임의로 단순화했었는데, 사용자 요청으로 **17개 와이어프레임 HTML 파일을 각각 다시 읽어서 실제 CSS 값을 그대로 이식**했습니다.

- **전역 디자인 시스템 재정비**(`src/app/globals.css`): 와이어프레임은 카드/버튼/필드가 전부 **각진 사각형**(border-radius 없음)이고 배지·아바타·토스트만 완전히 둥긂 — 이 규칙을 전역에 반영. 정확한 배지 색상 팔레트(제안중=파랑 #3b4c9c/#eef1fb, 확정=초록, 재조율중=빨강, 재확인대기=amber, 회의록=보라 #6b3fa0/#f4eefc), 정확한 폰트 크기/줄간격/여백 값도 전부 와이어프레임 실측치로 교체
- **공용 헤더 컴포넌트 신규**: `SubHeader`(뒤로가기+제목, 하위 화면용), `PageHeader`(제목+부제, 탭 최상위 화면용)
- **커스텀 캘린더 컴포넌트 신규**(`CalendarPicker`): 기존엔 브라우저 네이티브 `<input type=date>`를 썼는데, 와이어프레임은 자체 제작 달력 그리드(월 이동, 범위선택, 비활성 날짜 회색 처리)를 쓰고 있어서 `lib/dates.ts`에 `getMonthGrid()` 추가하고 range/single 모드를 지원하는 컴포넌트로 새로 만들어 화면2(회의생성)에 적용 — 후보기간 범위선택 + 안건마감 단일선택 둘 다 이 컴포넌트 사용
- **화면3/12 슬롯 그리드 재설계**: 기존엔 색깔 채운 사각형+이모지였는데, 실제 와이어프레임은 가능=흰 배경+옅은 회색 체크, 기피=대각선 스트라이프 패턴, 불가=완전히 까만 배경+흰 글자. `.slot-cell` 클래스로 교체
- **화면2 참석자 조직도 모달**: 기존엔 확인팝업 안에 우겨넣었는데, 와이어프레임은 화면 전체를 덮는 풀스크린 슬라이드 모달(부서별 아코디언). 새로 구현
- **화면4 안건 등록 폼**: 기존 인라인 확장 폼 → 와이어프레임처럼 하단에서 올라오는 바텀시트(`.bottom-sheet-overlay`)로 교체, 케밥 메뉴(⋮)로 수정/삭제 노출
- **화면5 대시보드**: 상단에 단계 스테퍼(✓ 아이콘 3단계) 추가, 참가자 응답 현황을 초록/빨강 알약(`resp-chip`)으로, 후보 시간 순위를 막대그래프(`score-bar`)로 시각화 — 전부 와이어프레임 패턴

각 화면 작업 후 `npx tsc --noEmit`로 타입체크하고, 최소 한 번씩은 브라우저로 열어서 실제 렌더링을 스크린샷으로 확인했습니다(전부 아님 — 화면2/1/4/5/3/6/7/8/9/11/16/17은 스크린샷으로 직접 확인, 화면10·12·14·15는 코드 작성 후 타입체크만 하고 스크린샷 확인은 생략).

## 후속 작업 (와이어프레임 정밀 대조 이후, 같은 날 진행)

와이어프레임 대조 완료 후 사용자 요청으로 4건을 추가로 진행했습니다. 아래 순서대로 진행됐고 전부 `npx tsc --noEmit`/`npx eslint src` 클린 + 브라우저 실제 클릭 검증까지 마쳤습니다.

### A. 데모버전 로그인 + README.md
- `src/server/actions/auth.ts`에 `demoLoginAction()` 추가 — 비밀번호 검증 없이 `kim.minjun@company.com`(김민준) 계정으로 바로 `createSession()`. `loginAction`과 리다이렉트 결정 로직(`resolvePostLoginRedirect`)을 공유해 중복 제거.
- `src/app/(auth)/login/page.tsx`: 로그인 폼 아래 구분선 + "데모버전으로 체험하기" 버튼 추가. 브라우저에서 실제로 비밀번호 없이 김민준 계정 진입 확인.
- 프로젝트 루트 `README.md`를 `create-next-app` 보일러플레이트에서 실제 앱 소개(핵심 흐름 요약) + 실행 방법 + 테스트 계정 표(김민준 실제 DB 비밀번호가 `5678`로 드리프트된 상태임을 명시, 재시드 시 `1111`로 초기화됨 안내) + 데모 로그인 안내로 전면 재작성.

### B. 와이어프레임 재대조 후 UI 3건 수정 + 버그 1건
전에 작성한 PROGRESS.md 갱신 이후에도 사용자가 실사용하며 발견한 문제들:
1. **참석자 정보 헤더**: 와이어프레임엔 있었지만 반영 안 됐던 "뒤로가기+화면명(좌) / 아바타·이름·부서·직위·역할배지(우)" 패턴을 `SubHeader`에 `attendee` 선택 prop으로 확장(`src/components/ui/SubHeader.tsx`). 회의상세·대시보드·안건·수동조정·완화요청·참석재확인·응답·선택응답 8개 화면에 적용. `respond`/`shortlist` 화면은 기존 인라인 커스텀 헤더 마크업을 걷어내고 공용 `SubHeader`로 통일(중복 제거).
   - **주의**: 구현 중 들여쓰기가 다른 두 번째 `SubHeader` 호출부(`ReconfirmClient.tsx`, `MitigationClient.tsx`의 두 번째 return 분기)에 `replace_all` 편집이 조용히 누락되는 실수가 있었음 — 반드시 브라우저로 직접 열어서 재확인 후 발견/수정함. 비슷한 일괄 치환 작업 시 `grep`으로 모든 호출부를 확인하는 습관 필요.
2. **예약 화면 타임라인 시간표시 정렬**: `.timeline-hours`가 flex `space-between`이라 시간 눈금(`toPercent` 공식 기반 절대좌표)과 라벨 위치가 어긋나던 버그를 라벨도 동일 `toPercent` 공식으로 절대배치하도록 수정(`ReservationsClient.tsx`, `globals.css`). 이 어긋남은 와이어프레임 원본에도 있던 버그였지만 사용자 요청대로 실제로 고침.
3. **내 정보 화면 섹션 여백**: `.info-section`에 대한 CSS 정의 자체가 누락돼 있어(`margin-bottom` 없음) 섹션 간 여백이 0이었던 문제를 `globals.css`에 규칙 추가로 해결. 프로필 화면 전용 스코프(`.profile-screen`)로 `.section-label` 색상(`var(--ink)`)과 편집모드 `.field-group`/`.field` 간격도 와이어프레임 실측치로 오버라이드(다른 화면의 공용 클래스는 건드리지 않음).
4. **회의 생성 화면 뒤로가기 버그**: "새 회의 만들기"가 예약 탭/내 회의 탭 양쪽에서 `/meetings/new`로 연결되는데, `SubHeader`의 `backHref="/meetings"`가 고정돼 있어 예약 탭에서 진입해도 뒤로가기 시 내 회의로 감. `backHref`를 제거해 `router.back()`(실제 진입 경로로 복귀)을 쓰도록 수정.

### C. 참석형태(대면/온라인) 흐름 개편
사용자 제안: 초기 응답 시점에 참석형태를 매번 묻는 대신 대면을 기본 전제로 하고, 참석재확인 단계에서 불참 처리 직전에 온라인 참석 가능 여부를 확인해 재조율 빈도를 줄임.
- `RespondClient.tsx`/`ShortlistClient.tsx`: `AttendanceModeSelector` 선택지 완전 제거(응답은 가능/기피/불가 슬롯 선택만). 죽은 컴포넌트(`src/components/meetings/AttendanceModeSelector.tsx`)와 더 이상 호출되지 않는 `setAttendanceMode` 서버 액션(`src/server/actions/slots.ts`) 삭제.
- `prisma/schema.prisma`의 `Participant.attendanceMode`에 `@default("대면")` 추가, 마이그레이션 `20260712075443_attendance_mode_default_offline` 적용 완료. `computeMeetingMode`에 값을 넘기는 폴백도 `?? "무관"` → `?? "대면"`으로 통일.
- `ReconfirmClient.tsx`(화면8): "불참 통보" 클릭 시 바로 사유 작성 폼으로 가지 않고, `"declineCheck"` 중간 확인 단계("이 시간에 온라인으로는 참석 가능하신가요?")를 거치도록 변경 — "네"는 기존 `handleOnline`(온라인 전환) 재사용, "아니오"는 기존 불참 사유 작성 폼으로 진입. 언제든 능동적으로 전환 가능한 기존 "참석 확정 — 온라인 전환" 독립 버튼도 그대로 유지.
- `reconfirmOnlineAction`(`src/server/actions/participants.ts`)이 기존엔 `Meeting.mode`를 재계산하지 않던 갭을 메움 — 필수참석자가 온라인 전환 시 회의 형태를 재계산하고, 하이브리드/온라인으로 바뀌었는데 화상링크가 없으면 자동 생성.
- 브라우저로 "불참 통보"→온라인 확인 단계 노출→"아니오"→기존 불참 폼 도달, "취소"로 복귀까지 실제 클릭 확인.

### D. Git 저장소 초기화 + GitHub 푸시
- `git init` 후 기존 `.gitignore`(`.env`, `prisma/dev.db` 등 이미 제외 설정돼 있었음)를 그대로 활용해 112개 파일 초기 커밋.
- `https://github.com/junga-k/meet-time.git`을 `origin`으로 추가하고 `master` 브랜치 푸시 완료(업스트림 연결됨).

### E. "소속"(부서·직위·직책) 입력 제거 — 항상 읽기 전용으로 수정
사용자 지적: 프로필설정·내정보 화면에서 부서/직위/직책을 사용자가 직접 입력/수정할 수 있게 돼 있었는데, 와이어프레임 설계 의도는 **이 값들이 사내 SSO/HRIS 디렉토리에서 자동 동기화되는 읽기 전용 정보**라 앱에서 입력받으면 안 되는 것이었음(`wireframe_13_profile_setup_1.html:181-183`, `wireframe_15_my_info_1.html:183` 개발자 노트에 명시). 값이 틀려도 사내 HR/IT 시스템에서 갱신해야지 앱에서 고치는 게 아님. 실제로 반영이 안 돼 있었던 걸 확인하고 수정함.
- `src/server/actions/auth.ts`의 `profileSchema`에서 `department`/`rank`/`position` 필드 제거 — 이제 `phone`/`extension`/`messengerId`(연락처)만 사용자가 저장 가능. (SSO 동기화를 시뮬레이션하는 `department`/`rank`/`position` 값 자체는 여전히 시드 데이터에 이미 채워져 있음 — 앱이 이 값을 절대 쓰지 않을 뿐)
- `src/app/(auth)/profile-setup/ProfileSetupForm.tsx`: "소속 정보" 입력 섹션(부서/직급/직책 3개 필드) 전체 삭제. `profile-setup/page.tsx`의 readonly-card 아래 안내문을 와이어프레임 문구("부서·직위·직책은 회사 디렉토리 정보를 자동으로 반영해요. 자세한 내용은 '내 정보' 화면에서 확인할 수 있어요")로 교체.
- `src/app/(app)/profile/ProfileClient.tsx`("내 정보"): "소속" 섹션을 편집모드 여부와 무관하게 항상 읽기 전용 `info-row`로 고정 렌더링(기존엔 "수정" 클릭 시 부서/직위/직책도 `<input>`으로 바뀌었음). "연락처" 섹션만 편집모드에서 입력 필드로 전환되도록 분리.
- 브라우저로 재검증: 데모 로그인(phone 초기화됨) → 프로필설정 화면에 소속 입력란이 없고 안내문만 노출 → 연락처만 입력해 완료 → "내 정보"에서 "수정" 눌러도 소속(기획팀/과장)은 텍스트 그대로, 연락처만 입력란으로 바뀌는 것 확인.

### F. 컬러 팔레트 리브랜딩 (`ui/` 참고 이미지 기반)
`ui/컬러팔레트.jpeg`(세이지그린 89A485·베이지 DDB595·코랄 D77273·크림슨 CE4055·다크차콜 233134 5색 팔레트)와 `ui/라이트:다크모드 컬러팔레트.jpeg`(라이트/다크 대비 톤페어 가이드)를 참고해 앱 전체 색상 시스템을 재정의. 상세 매핑 근거와 최종 값은 `ui/컬러팔레트_적용결과.md`에 정리(원본 값은 `src/app/globals.css`의 `:root` 블록이 기준).
- **적용 범위**: 상태배지 포인트컬러뿐 아니라 텍스트/테두리/배경 중립색까지 전환하는 전체 리브랜딩으로 진행(사용자 선택). 5색 팔레트에 없는 파랑(제안중)·보라(회의록 태그)는 팔레트 톤에 맞춰 새로 조색.
- **`globals.css` `:root` 토큰 12개 값 교체**: `var(--ink)` 86곳·`var(--border-light)` 75곳 등 대부분의 화면이 이미 토큰을 참조하고 있어 이 한 곳만 바꿔 전체 화면에 자동 반영되는 구조 확인 후 진행.
- **하드코딩된 회색 리터럴 정리**: `globals.css` 전체에서 `#fafaf9`/`#f0f0ee`/`#f5f5f4`/`#f7f7f5`/`#ececea`/`#eee`/`#e5e5e2`/`#d8d8d5`/`#b7b7b3` 등 약 30곳을 상대 명도를 유지하며 같은 톤 계열로 일괄 치환. 토큰을 안 거치던 빨강 리터럴(`#a32d2d`, `globals.css` 3곳 + `MeetingCreateForm.tsx` 1곳)과 회피 슬롯 줄무늬 패턴(`#d8d8d8`)도 각각 `var(--accent-red)`/`var(--border-light)`로 편입.
- **버그 발견 및 수정**: 처음엔 `--page-bg`에 크림베이지, `--card-bg`에 흰색을 넣었는데 `.safe-area-shell`(앱 카드)이 `max-width:390px`라 실제 모바일 폭에서는 `--page-bg`(body)가 전혀 노출되지 않는 구조라는 걸 사용자 실사용 피드백으로 확인 — 카드가 뷰포트를 완전히 덮어 리브랜딩의 핵심인 크림 톤이 실기기에서는 안 보이는 문제였음. 두 값을 서로 바꿔 크림 톤이 실제로 보이는 `--card-bg`로 이동. 이후 "색이 진하다"는 피드백으로 `--card-bg`를 `#f8f1ea`→`#fcf8f4`(약 96% 흰색 혼합)로 추가로 옅게 조정.
- **검증**: `npx tsc --noEmit`/`npx next lint` 클린. 개발 서버가 서빙하는 실제 CSS 번들(`/_next/static/css/app/layout.css`)에서 `--ink`/`--page-bg`/`--card-bg`/`--accent-red` 값이 반영됐는지 직접 확인(색상 값 교체 작업이라 코드 구조 변경 없음).

### G. Vercel 배포 실패 해결 + Turso(원격 libSQL)로 DB 이전
사용자가 Vercel 배포를 시도하며 겪은 두 가지 문제를 순차 해결:

1. **1차: "Next.js 프로젝트라 승인이 안 됨"** — `next.config.mjs`에 `eslint.ignoreDuringBuilds`/`typescript.ignoreBuildErrors` 추가(사용자 요청 그대로, 단 파일이 `.mjs`라 `module.exports` 대신 기존 `export default` 형식에 맞춰 적용).
2. **2차: "Failed to collect page data for /meetings/[meetingId]/adjust"** — 로컬에서 `node_modules/.prisma/client`를 지우고 재빌드해 **완전히 동일한 에러(같은 라우트까지)**를 재현해 원인 특정: `package.json`에 `postinstall` 스크립트가 없어서 Vercel의 `npm install` 후 Prisma Client가 생성되지 않은 상태로 빌드가 진행됐던 것. `"postinstall": "prisma generate"` 추가로 해결, 로컬 재현 시나리오로 수정 확인.
3. **근본 문제 — SQLite는 Vercel(서버리스)에서 애초에 못 씀**: `prisma/dev.db`가 `.gitignore`에 있어 배포물에 파일 자체가 없고(사용자가 "DB도 커밋한거 아니야?"라고 질문해 확인해줌), 설령 포함해도 서버리스 함수는 요청마다 파일시스템이 초기화돼 쓰기가 유지되지 않음. Railway/Render(디스크 유지되는 서버) 대안도 제시했으나 "제출용이라 어느 환경에서도 문제없어야" 한다는 요구사항 때문에, 안정성이 가장 검증된 **Vercel + 네트워크 기반 DB** 조합을 위해 **Turso(SQLite 호환 서버리스 DB)** 로 이전.

**Turso 마이그레이션 상세**:
- Turso CLI 설치(`curl -sSfL https://get.tur.so/install.sh | bash`) → 사용자가 직접 GitHub로 `turso auth login` 인증(계정 생성은 대신할 수 없어 사용자가 진행) → `turso db create meet-time`(AWS ap-northeast-1)으로 DB 생성.
- `turso db tokens create`로 발급받은 토큰은 터미널에 출력하지 않고 바로 `.env`에 파일 기록으로만 저장(쉘 출력에 노출 안 되게 `TOKEN=$(...); printf ... >> .env` 형태로 처리).
- `npm install @libsql/client@^0.8.0 @prisma/adapter-libsql@5.22.0`(주의: `@prisma/adapter-libsql`을 버전 지정 없이 설치하면 최신 v7이 깔려 Prisma 5.22.0 클라이언트와 안 맞음 — 반드시 `@prisma/client`와 동일한 5.22.0으로 버전 고정 필요).
- `prisma/schema.prisma`의 `generator client`에 `previewFeatures = ["driverAdapters"]` 추가(Prisma 5.x에서 드라이버 어댑터는 프리뷰 기능). `datasource.url`은 로컬 파일(`env("DATABASE_URL")`) 그대로 유지 — Turso 공식 워크플로우가 "로컬 SQLite로 마이그레이션 생성 → `turso db shell`로 원격에 수동 적용"이라 CLI용 로컬 연결은 남겨둠(`prisma migrate deploy`는 Turso에서 공식 미지원).
- `src/lib/prisma.ts`: `TURSO_DATABASE_URL` 환경변수가 있으면 `@libsql/client`의 `createClient()`로 만든 client를 `PrismaLibSQL` 어댑터에 감싸 사용, 없으면(로컬 기본값) 기존처럼 로컬 SQLite 파일 그대로 사용하도록 분기. **주의**: 처음엔 공식 문서 예제(최신 버전 기준)대로 `new PrismaLibSQL({ url, authToken })`(설정 객체 직접 전달)로 짰다가 `this.client.transaction is not a function` 런타임 에러 발생 — 5.22.0에 고정된 `@prisma/adapter-libsql`의 실제 README를 확인해보니 이 버전은 `createClient()`로 만든 client **인스턴스**를 넘겨야 하는 구버전 API였음(`new PrismaLibSQL(libsqlClientInstance)`). 버전마다 API가 다르므로 설치된 실제 패키지의 README/타입을 확인하는 습관 필요.
- `prisma/seed.ts`가 자체적으로 `new PrismaClient()`를 새로 만들고 있어서 위 어댑터 분기를 안 타고 로컬 파일에만 시딩되는 문제 발견 → `src/lib/prisma.ts`의 공용 `prisma` 싱글턴을 import하도록 수정.
- 기존 마이그레이션 3개(`20260712035144_init`, `20260712040922_add_reconfirmed_at`, `20260712075443_attendance_mode_default_offline`)를 순서대로 `turso db shell meet-time < migration.sql`로 원격 DB에 수동 적용, `npm run seed`로 6개 계정 + 4개 회의실 시딩 완료(`turso db shell`로 테이블/행 개수 직접 확인).
- **검증**: `npx tsc --noEmit`/`npx eslint src`/`npx next build` 전부 클린. 브라우저 확장이 이 세션 도중 끊겨서 UI 클릭 검증 대신, 실제 앱이 쓰는 `src/lib/prisma.ts`를 그대로 import하는 임시 스크립트로 읽기(유저 조회+비밀번호 검증+카운트)와 쓰기(row 생성→읽기확인→삭제) 전부 Turso를 통해 왕복되는 것을 확인 후 스크립트 삭제. 로컬 dev 서버(`localhost:3311`)도 재기동해 실제로 Turso 연결로 정상 구동 중.
- **아직 안 한 것**: Vercel 프로젝트 환경변수에 `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`(+ 기존 `SESSION_SECRET`, `DATABASE_URL`은 더미값이라도 필요할 수 있음)을 추가하고 재배포해서 실제 배포 URL에서 로그인이 되는지 확인하는 마지막 단계가 남음 — 이건 Vercel 대시보드 설정이라 사용자가 직접 하거나 다음 세션에서 안내 필요.
- 참고: `.env.example`에 `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` 안내 주석 추가함.

### H. 데모 계정용 회의 데이터 시딩 + "내 회의" 하단 버튼 제거
데모버전(`demoLoginAction`, 김민준 계정)으로 들어가도 "내 회의" 목록이 비어 있어 전체 서비스를 둘러볼 수 없던 문제 해결.
- `prisma/seed.ts`에 `seedDemoMeetings()` 추가 — 김민준이 **주최자·필수참석자·선택참석자** 역할을 각각 2건씩(총 6건) 겪도록 시딩: ①③⑤ 응답 대기 중인 제안중 회의(주최자/필수/선택 관점 각 1건, 화면3·12로 카드 클릭이 이어짐) ④ 확정됐지만 김민준 본인 재확인 전(목록에 "재확인 대기" amber 배지, 화면8로 이동) ⑤ 확정+재확인 완료+회의록 등록(목록에 "회의록" 보라 배지, 화면9로 이동) ⑥ 이미 종료된 확정 회의(목록 "종료" 필터용). 회의별로 실제 `TimeSlot`/`SlotResponse`/`RoomBooking`/`MeetingNote`까지 채워 카드 클릭 시 각 화면이 빈 데이터로 깨지지 않게 함. 제목 존재 여부로 멱등성 확보(재시드해도 중복 생성 안 됨, 재실행으로 확인).
- `generateTimeSlotInputs`(`src/lib/scheduling.ts`)를 시드 스크립트에서도 그대로 재사용해 실제 앱과 동일한 규칙(09:00~20:00, 30분 간격)으로 슬롯 생성. `tsx`가 `tsconfig.json`의 `@/*` 경로 별칭을 자체적으로 해석하는 것을 직접 테스트로 확인한 뒤 `@/lib/...` import로 재사용(기존 `seed.ts`는 관례상 상대경로만 쓰고 있었음).
- **주의**: `.env`에 `TURSO_DATABASE_URL`이 설정돼 있어 `npm run seed` 실행 시 로컬이 아니라 **배포용 원격 Turso DB에 직접 시딩됨**(`src/lib/prisma.ts`의 자동 분기, 후속 작업 G 참고) — 실제로 실행해 반영함.
- `src/app/(app)/meetings/MeetingListClient.tsx`: 하단 고정 "새 회의 만들기" 버튼(`.footer` 블록) 제거, 미사용된 `Link` import도 함께 정리. 회의 생성은 "예약" 탭의 "새 회의 만들기 시작" 버튼으로만 진입 가능(기존에도 있던 경로, 중복 진입점만 줄어든 것).
- **검증**: `npx tsc --noEmit`/`npx next lint` 클린. 시드 실행 후 `Participant`를 직접 조회해 김민준의 6개 회의가 의도한 역할·상태·응답여부로 정확히 들어갔는지 확인, 선택확인중 회의의 숏리스트 슬롯(5개)·슬롯응답(슬롯당 3건) 개수 확인, 재시드해도 회의 개수가 6건으로 유지되는지(중복 생성 안 됨) 확인.

## 후속 작업 2 — Vercel/Turso 배포 완료 + 실사용 피드백 반영 (2026-07-12 밤 ~ 07-13)

위 "후속 작업 G"에서 Turso 마이그레이션 코드는 끝냈지만 Vercel 환경변수 등록·재배포가 남아있었음. 이 세션에서 그 마무리부터 시작해 배포된 URL(`https://meet-time-seven.vercel.app`)을 보며 실사용 피드백을 다수 반영했다. 아래는 커밋 순서대로 정리(전부 `npx tsc --noEmit`/`npx eslint src` 클린 + 대부분 `npx next build` 확인 후 커밋·푸시 완료).

### I. Vercel 배포 마무리
- Vercel 대시보드에서 `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` 환경변수 등록(스크린샷 보며 실시간 안내) — "Environments"가 아니라 "Environment Variables" 메뉴라는 점, Shared 환경변수는 "Link to Projects"가 별도로 필요하다는 점, 값에 `.env` 파일의 리터럴 따옴표를 그대로 붙여넣으면 `LibsqlError: URL_INVALID`가 난다는 점, 값 자체에 보이지 않는 문자가 섞이면 "invalid characters" 에러가 난다는 점을 각각 발견해 해결.
- GitHub 연동이 "Project Link not found"로 끊겨 있던 걸 재연결(Reconnect) 후 빈 커밋(`git commit --allow-empty`)으로 강제 재배포해 최종 확인 — 로그인부터 프로필설정까지 실제 배포 URL에서 정상 동작 확인.
- 데모버전 회의 데이터(`seedDemoMeetings`)와 "내 회의" 하단 버튼 제거가 다른 동시 작업 세션에서 이미 반영돼 있던 것을 발견 — 의도된 변경인지 확인(응, 회의 생성은 예약 탭에서만 하도록) 후 커밋·Turso 재시딩.

### J. 루트 접속 시 항상 로그인 화면부터
- `src/app/page.tsx`: `redirect("/meetings")` → `redirect("/login")`.
- `src/middleware.ts`: 이미 로그인된 세션이어도 `/login`에서 `/meetings`로 되돌리던 로직 제거 — URL로 들어오면 세션 유무와 무관하게 항상 로그인 화면이 먼저 보이도록.
- 이 작업 도중 동시 작업 세션이 `schema.prisma`에 임시로 추가했던 `messengerType` 필드(마이그레이션 없이 추가돼 전체 User 쿼리가 깨짐)를 발견 — 상대 세션이 자체적으로 되돌린 뒤 Prisma client 재생성 + dev 서버 재기동으로 복구 확인.

### K. 프로필 설정 — 사진 업로드/전화번호 자동포맷/메신저 라벨
- `src/lib/image.ts` 신규: `resizeImageToDataUri`(256px 정사각형 크롭 후 JPEG data URI, 백엔드 파일저장소 없이 클라이언트에서만 처리).
- `src/lib/phone.ts` 신규: `formatMobilePhone`(010-1234-5678), `formatLandlinePhone`(서울 02/지역 3자리 구분).
- `ProfileSetupForm.tsx`: 아바타 편집 버튼에 숨김 `<input type=file accept=image/*>` 연결(모바일은 갤러리+카메라, 데스크톱은 파일탐색기), 전화번호·내선번호 입력에 자동 포맷 적용, "메신저 ID" 라벨을 특정 브랜드명 없이 "사내메신저"로 통일.
- `ProfileClient.tsx`(내 정보)에도 동일한 전화번호 포맷터 + "사내메신저" 라벨 반영.

### L. 내 정보 수정모드 — 로그아웃 제거 + 비밀번호 변경 추가
- `changePasswordAction`(`src/server/actions/auth.ts`) 신규 — 현재 비밀번호 검증 후 새 비밀번호로 교체.
- `ProfileClient.tsx`: 조회모드에는 로그아웃 버튼만, 수정모드에는 로그아웃 버튼을 없애고 현재/새/새 비밀번호 확인 3필드 + 자체 제출 버튼을 가진 "비밀번호 변경" 섹션 추가.

### M. 알림 목록 예시 데이터 8건 시딩
- `seedDemoNotifications(kimId)`(`prisma/seed.ts`) — 기존 데모 회의 6건에 연결된 안건등록/응답요청×2/시간확정×2/참석재확인/회의실확정/회의록등록 알림을 읽음/안읽음 섞어 시딩(멱등 — 이미 알림이 있으면 스킵). 사용자 승인 받은 뒤 Turso에 실행.

### N. 예약 화면 — "최근 회의" → "내가 만든 회의"
- `src/lib/meetingCard.ts` 신규: `MeetingCardVM`/`isPendingReconfirm`/`resolveMeetingCardHref`(회의 상태·역할·응답여부 기반 카드 클릭 라우팅 로직)를 `MeetingListClient.tsx`에서 추출해 공용화.
- `reservations/page.tsx`: 아무 역할이나 참여 중인 회의 5건 → **내가 주최한(organizerId=본인)** 회의 5건으로 쿼리 변경.
- `ReservationsClient.tsx`: 라벨 "최근 회의"→"내가 만든 회의", 회의명 클릭 시 `resolveMeetingCardHref`로 상태에 맞는 화면(응답/대시보드/재확인/상세)으로 이동하도록 변경(기존엔 항상 상세로만 이동).

### O. 새 회의 만들기 — 조직도 모달 개선 + 인원 확충
- "회의 생성" → "새 회의 만들기" 문구 변경.
- 조직도 모달에 이름 검색 입력 추가(검색 중엔 해당 부서 자동 펼침), 부서별 인원을 직위(연차 높은 순: 부장>차장>과장>대리>주임>사원) → 이름순으로 정렬, 참석자 선택 후 확인할 수 있는 "저장(N명 선택됨)" 버튼을 모달 하단에 추가.
- `prisma/seed.ts`의 `USERS`를 6명 → **14명**(영업팀·인사팀 신설)으로 확충 — 기존 6명은 이메일이 데모 회의 시딩에 그대로 참조되므로 순서/값 변경 없이 뒤에만 추가. `TEST_ACCOUNTS.md`/`README.md`에 8개 신규 계정 반영, 사용자 승인 받은 뒤 Turso에 재시딩.

### P. 모든 화면 390×844px 고정 프레임
- `.safe-area-shell`을 기존 `max-width:390px; min-height:100dvh`(실기기 뷰포트에 맞춰 늘어남)에서 `width:390px; height:844px; overflow:hidden`(항상 고정)으로 변경 — 제출/데모 시 어떤 환경에서도 동일한 크기로 보이도록.
- `body`를 flex 중앙 정렬해 데스크톱 등 넓은 화면에서 프레임이 가운데 보이게 하고, `.safe-area-shell`에 `transform: translateZ(0)`을 추가해 토스트/확인팝업/바텀시트 같은 `position:fixed` 오버레이가 브라우저 전체가 아니라 이 프레임 기준으로 뜨도록 함.

### Q. 참석재확인 화면 개편
- 기존 "참석 확정 — 온라인 전환"(단일 버튼)을 **"참석 형태 변경"**(클릭 시 대면/온라인/불참 인라인 선택지 노출) + **"참석 확정"**(현재 참석 형태 유지하고 재확인만 완료) 두 버튼으로 분리.
- "참석 형태 변경"에서 "불참" 선택 시 곧바로 사유 작성으로 가지 않고 "온라인으로는 참석 가능하신가요?" 확인 단계를 먼저 거치도록(사용자 명시 요청) — 그래도 불참이면 기존 사유 작성 폼으로 진입.
- 기존 "불참 통보" 링크 자리는 **"대리 참석자 지정"**으로 대체(불참 진입 경로가 참석형태 변경 쪽으로 옮겨갔으므로 중복되던 별도 대리참석자 버튼 제거).
- `src/server/actions/participants.ts`: `reconfirmOnlineAction`의 회의 형태 재계산 로직을 공용 헬퍼로 뽑아 `reconfirmOfflineAction`(신규)에도 재사용, 참석형태 변경 없이 재확인만 하는 `reconfirmAction`(신규) 추가.

### R. 회의 상세류 화면 — 뒤로가기 버그 수정
회의 상세/참석재확인/대시보드/응답/선택응답 5개 화면의 `SubHeader`가 `backHref="/meetings"`로 고정돼 있어, "내가 만든 회의"(예약 탭)에서 들어와도 뒤로가기를 누르면 예약 탭이 아니라 항상 "내 회의" 탭으로 이동하던 버그. `backHref`를 제거해 `SubHeader`의 기본 동작(`router.back()`)을 쓰도록 수정 — "새 회의 만들기" 화면에 이미 적용돼 있던 것과 동일한 방식.

### S. 회의 상세 — 캘린더 추가 버튼을 회의 시작 전까지만
확정 시간이 있으면 종료된 회의에도 계속 떠 있던 "캘린더에 추가" 버튼을 `!meetingStarted` 조건 추가로 시작 전까지만 노출.

### T. 회의록 화면 — 스타일 누락 수정
작성자 행(`.author-row`/`.author-label`/`.author-name`)이 JSX에서 이미 쓰이고 있었는데 해당 CSS가 `globals.css`에 없어 스타일 없이 렌더링되던 문제 수정. "향후 추진 과제" 빈 상태도 정의되지 않았던 `.action-empty` 대신 같은 화면의 다른 빈 상태와 동일한 `.meta-box` 패턴으로 통일.

### U. 내 회의 검색창 배경 통일
`.search-input-wrap` 배경을 `#faf7f2` → `#fff`로 바꿔 아래 회의 카드(흰색)와 통일(회의 생성 화면의 조직도 검색창도 같은 클래스 공유라 함께 반영).

### V. 대시보드 접근 복구 + "리마인드 알림 보내기" 신규
- **버그 발견**: `resolveMeetingCardHref`가 회의 상태가 "확정"이 되면 역할과 무관하게 항상 회의 상세로만 연결해, 주최자가 확정된 회의를 리스트에서 클릭해도 응답 현황·회의실 자동매칭 결과를 보는 대시보드로 다시 들어갈 방법이 없었음(설계문서의 "확정→대시보드→참석재확인→회의상세(시작부터)" 흐름과 불일치). 회의가 아직 시작 전이고 재확인도 끝났으면 주최자는 대시보드로, 시작한 뒤에는 회의 상세로 이동하도록 분기 추가.
- **신규 기능**: `sendReminderAction`(`src/server/actions/meetings.ts`) 추가 — 제안중/재조율중이면 현재 단계(필수응답중은 필수+주최자, 선택확인중은 선택)의 미응답 참석자에게 "응답요청" 알림을, 확정 상태면 아직 참석 재확인을 안 한 참석자에게 "참석재확인" 알림을 재발송. 대시보드의 "참가자 응답 현황" 섹션 제목 옆에 "리마인드 보내기" 버튼 추가.

### W. 회의실 현황 조회 — 시간 선택 완전 제거
처음엔 시/분 선택을 00~23시/10분 단위로 개선하려 했으나, 사용자가 아예 시간 선택 자체를 없애고 **날짜+인원만으로 조회**하도록 요청 변경 — `searchHour`/`searchMinute`/`activeSearchMinutes` 상태와 관련 select 2개, `.room-time-select`/`.room-time-colon` CSS 전부 제거. 조회 후 회의실 상태는 특정 시각 기준이 아니라 그날 예약 유무("예약 있음"/"예약 가능")로 표시(조회 전 오늘 날짜인 경우의 "지금 예약중/비어있음" 표시는 유지).

### X. 프로덕션 최종 점검
`meet-time-seven.vercel.app`에 실제 세션 쿠키로 접속해 `/`, `/login`, `/meetings`, `/reservations`, `/notifications`, `/profile`, `/profile-setup`, `/onboarding`, `/meetings/new`, 대시보드·참석재확인·회의상세·회의록 화면까지 전부 200 응답 + 에러 없음 확인. 새로 만든 문구/버튼(새 회의 만들기, 리마인드 보내기, 참석 형태 변경/참석 확정/대리 참석자 지정, author-row, 캘린더 버튼 시작전/종료후 분기)도 실제 배포본에 반영된 것까지 텍스트 매칭으로 확인.

### 운영 메모 — 동시 작업 세션 존재
이 저장소는 **다른 Claude Code 세션(사용자 본인의 별도 계정/터미널)이 같은 로컬 경로에서 동시에 작업 중**이었다(예: 예약 탭 "내 회의실 예약" 목록 추가→제거, 캘린더 오늘 날짜 표시, 회의록 화면 일부 스타일). `git status`에서 내가 만들지 않은 변경사항이 보이면 반드시 `git diff`로 내용을 확인한 뒤 **내가 의도한 파일만 골라서 `git add`** 하고, 상대 세션의 진행 중인 작업은 그대로 두는 방식으로 충돌을 피했다. 다음 세션도 이 습관을 유지할 것 — `git add -A`/`git commit -a` 금지, 항상 파일 단위로 스테이징.

## 확정된 기술 스택

- **Next.js 14.2.35** (App Router) + **React 18** — 스캐폴딩 당시 최신 Next.js 16 / Prisma 7이 훈련 데이터 이후 나온 버전이라 의도적으로 다운그레이드함(`next.config.ts`는 Next16 전용이라 `next.config.mjs`로 교체)
- **Prisma 5.22.0 + SQLite** — 로컬 개발은 여전히 `prisma/dev.db`(`.env`의 `DATABASE_URL`) 파일을 그대로 사용. 배포(Vercel)용으로는 **Turso(원격 libSQL)** 를 추가 연결(`@prisma/adapter-libsql`, `src/lib/prisma.ts`가 `TURSO_DATABASE_URL` 존재 여부로 자동 분기) — 상세는 위 "후속 작업 G" 참고
- **zod 3.25.76**(3.x API, Anthropic SDK 피어디펜던시 때문에 3.25+로 고정), **bcryptjs**, **jose**(세션 JWT), **tsx**(시드 스크립트 실행)
- 인증: NextAuth 미사용, `src/lib/session.ts`(Edge 호환, middleware용) + `src/lib/auth.ts`(Node 전용, prisma/bcrypt 포함)로 직접 구현한 서명 쿠키 세션
- 로그인 계정: `TEST_ACCOUNTS.md`·`README.md` 참고 — 총 14명(기존 6명 + 조직도 확충용 8명, "후속 작업 2-O" 참고) 전부 초기 임시 비밀번호 `1111`(단, 브라우저 테스트 중 김민준 계정 비밀번호를 `5678`로 변경해 검증했음 — 필요하면 `1111`로 다시 바꾸거나 DB를 재시드). 비밀번호 몰라도 로그인 화면의 "데모버전으로 체험하기" 버튼으로 김민준 계정에 바로 진입 가능(`demoLoginAction`, 비밀번호 드리프트와 무관하게 항상 동작)
- Git 저장소: `git init` 완료, 원격 `origin` = `https://github.com/junga-k/meet-time.git`(`master` 브랜치 푸시 완료)

## 지금 실행 방법

```bash
cd /Users/idonghun/myProject/meeting
npm run dev -- -p 3311
# 최초 1회만: npx prisma migrate dev && npm run seed
# 데이터를 초기화하고 싶으면: rm prisma/dev.db && npx prisma migrate dev && npm run seed
```
`http://localhost:3311/login`에서 `TEST_ACCOUNTS.md`의 계정으로 로그인. 여러 사용자를 테스트하려면 브라우저 쿠키가 탭 간에 공유되므로 **같은 탭에서 우측 상단 "로그아웃"으로 전환**해가며 테스트해야 함(멀티 탭 동시 로그인 불가 — 브라우저 쿠키가 도메인 단위로 공유되기 때문, 앱 버그 아님).

## 완료된 작업 (Task 1~10 전부 완료)

| # | 항목 | 상태 |
|---|---|---|
| 1 | 스캐폴딩 | ✅ |
| 2 | Prisma 스키마 + seed + `TEST_ACCOUNTS.md` | ✅ |
| 3 | 인증 (화면13·14·15) | ✅ 브라우저 검증 완료 |
| 4 | 앱 셸 | ✅ |
| 5 | 공용 알고리즘(`lib/scheduling.ts` 등) | ✅ 단위 테스트 통과 |
| 6 | 핵심 흐름 화면 1·2·3·12·5·4 | ✅ 브라우저 end-to-end 검증 완료 |
| 7 | 조건부 화면 6(완화요청)·7(수동조정) | ✅ 화면 렌더링 확인(완화요청이 실제로 트리거되는 시나리오까지는 미실측 — 아래 "확인 못 한 것" 참고) |
| 8 | 화면 8(재확인)·9(상세)·10(회의록) | ✅ 8·9는 브라우저 검증 완료, 10은 코드 검토 + 미시작 회의 리다이렉트만 확인(AI 초안 생성은 API 키 없어 미실측) |
| 9 | 화면 11(알림)·16(내정보+비밀번호변경)·17(예약) | ✅ 전부 브라우저 검증 완료(비밀번호 변경은 실제로 바꾼 뒤 재로그인까지 확인) |
| 10 | 알림 발송 점검 + 최종 빌드 검증 | ✅ 아래 참고 |

## 브라우저로 실측 확인된 전체 플로우

로그인(임시비번 1111, 또는 데모버전 로그인 버튼) → 프로필설정 → 온보딩 → 회의 생성(참석자 검색+조직도+역할지정+캘린더+시간길이+안건마감, 네이티브 date input 입력 시 연도부터 입력해야 세그먼트가 올바르게 채워짐 주의) → 확인팝업 → 대시보드 자동 이동 → 필수 참석자 3명(주최자 포함) 슬롯 응답(그리드 3단계 토글 — **참석형태 선택은 없음, 대면이 기본 전제**) → **전원 응답완료 시 자동으로** 상위 5개 압축 + 회의 형태 계산(필수참석자 전원 대면 기본이라 기본값은 오프라인, 참석재확인 단계에서 누군가 온라인으로 전환하면 하이브리드로 재계산됨) + 단계 전환 + 선택참석자에게 알림 → 선택 참석자 응답(2단계 토글, 마찬가지로 참석형태 선택 없음) → **전원 응답완료 시 자동으로** 최종 슬롯 확정 + **회의실 자동매칭**(회의실 A) + 필요 시 화상링크 자동생성 + 관련 알림 3종 발송 → 대시보드에 확정 결과 표시 → 회의 목록에 "재확인 대기"(amber) 배지 정상 표시 → 참석재확인에서 "참석 확정 — 온라인 전환"으로 전환하거나, "불참 통보" 클릭 시 뜨는 온라인 참석 가능 여부 확인 단계를 거쳐 온라인 전환 또는 불참 처리 → 온라인 전환 시 회의 형태 재계산 + 화상링크 자동 생성까지 확인 → 배지가 "확정"(초록)으로 전환 → 회의 상세에서 참석자별 확정상태/장소/화상링크/안건 정상 표시, "회의록 확인하기"가 회의 시작 전이라 비활성화 → 안건 등록(필독 배지, 확인팝업, 작성자만 수정/삭제) → 알림 목록에서 각 알림 클릭 시 올바른 화면으로 라우팅(참석재확인→화면8 등) → 내 정보에서 비밀번호 변경 후 실제로 로그아웃/재로그인해 새 비밀번호로 로그인 성공 → 예약 화면에서 회의실별 현황(확정된 예약 포함) 정상 표시, 타임라인 시간표시가 눈금과 정확히 정렬됨 → 회의상세/대시보드/안건/수동조정/완화요청/참석재확인/응답/선택응답 8개 화면 전부 헤더에 참석자 아바타·이름·부서·직위·역할배지 표시 확인.

## 실제로 브라우저까지는 못 본 것 (코드는 완성, 시나리오 구성이 오래 걸려 생략)

- **완화요청(화면6) 트리거 로직은 DB 레벨 통합 테스트로 검증 완료**: 하드패스 0개 상황(필수 참석자 2명이 같은 슬롯에 전원 불가)을 직접 만들어 `triggerMitigationSequence`/`respondToMitigation`을 호출한 결과 — ① `selectFinalSlot`이 정확히 null 반환 ② 첫 완화요청이 두 차단자 중 한 명에게 생성 ③ "유지" 응답 후 **다른** 차단자에게 순차 요청(중복 없음) ④ 전원 유지 후엔 더 이상 요청을 만들지 않고 null 반환(= 화면7 유도 조건) — 전부 기대대로 동작 확인. **다만 화면6 UI 자체를 통해 "유지"/"가능으로 변경" 버튼을 실제로 클릭해보진 않았음**(직접 URL 진입으로 렌더링만 확인).
- **재조율 3회 캡 도달 → 에스컬레이션**: `advanceRescheduleCount`가 3회째에 `RescheduleCapReachedError`를 던지는 로직은 구현했지만 실제로 불참을 3번 반복시켜 확인하지는 않음.
- **화면10 AI 초안 생성**: `ANTHROPIC_API_KEY`를 설정하지 않았으므로 실제 Claude API 호출은 안 해봄. `AiNotConfiguredError` 분기(버튼은 노출, 클릭 시 에러 토스트)는 코드상으로만 확인.
- **후보 기간 연장(+7일)**, **회의실 재선택**, **온라인 전환**(화면7 수동조정 화면의 `setModeOnlineAction` — 화면8 참석재확인의 `reconfirmOnlineAction`과는 별개 액션)은 코드 작성 후 타입체크만 통과, 실제 클릭 테스트는 안 함.

## 알려진 갭 (설계에는 있지만 이번 빌드에서 구현 안 함)

- **"마감임박" 알림(`NOTIFICATION.type`)**: db_model_mvp.md 스펙엔 있지만, 이 알림은 "필수/선택 응답 마감이 다가오면 자동 리마인드"라는 **시간 기반(cron/스케줄러) 트리거**가 필요합니다. 이번 빌드엔 백그라운드 작업 스케줄러를 세팅하지 않아서(계획서에도 명시돼 있지 않았음) 이 알림 타입만 실제로 발송되는 코드가 없습니다. 나머지 11개 `NOTIFICATION.type`(안건등록/수정/삭제, 시간확정, 재조율, 완화요청, 참석재확인, 회의실확정, 불참안내, 응답요청, 회의록등록)은 전부 이벤트 발생 시점에 정상 발송됩니다. 필요하면 Vercel Cron이나 별도 스케줄러를 붙이고 `requiredResponseDeadline`/`optionalResponseDeadline`이 임박한(예: 24시간 이내) 미응답 참석자에게 알림을 도는 배치를 추가하면 됩니다.
- **데스크톱/태블릿 레이아웃**: 계획대로 모바일(390px 폭) 전용으로만 구현. 반응형 브레이크포인트 없음.
- **회의실 예약 승인/거절 플로우**: 대시보드에 "확정 결과(승인 대기)" 카드는 있지만, `confirmMeetingSlot`이 회의실을 찾으면 즉시 확정(자동 승인)하는 구조라 별도의 "승인" 버튼 클릭 액션은 없음(스펙의 "주최자 확인 후 승인 또는 변경"에서 변경은 화면7의 회의실 재선택으로 구현, 승인은 자동으로 처리).

## 디자인시스템 (별도 계정에서 진행 예정 — 병합 전 충돌 확인 필수)

디자인시스템 관련 작업은 **다른 계정의 Claude Code 세션에서 별도로 진행**한 뒤 이 저장소에 병합(merge)될 예정입니다. 이 문서를 보는 세션(이 계정이든 병합 후 이어받는 세션이든)은 아래 순서를 반드시 지켜주세요.

### 현재 상태 (병합 전 기준점)
- 아직 별도의 디자인 토큰 파일이나 Storybook 같은 공식 디자인시스템 산출물은 없음. 지금까지는 **`src/app/globals.css` 한 파일에 와이어프레임 실측치를 그대로 이식하는 방식**으로 색상 팔레트(배지별 색상, `var(--ink)`/`var(--muted)`/`var(--border-light)` 등), 타이포그래피, 버튼/카드/필드 스타일(각진 사각형 + 배지·아바타·토스트만 둥근 모서리), 슬롯 그리드(`.slot-cell`), 타임라인(`.timeline-*`) 등을 정리해 둔 상태(위 "와이어프레임 정밀 대조", "후속 작업 B" 참고).
- 공용 컴포넌트는 `src/components/ui/`(`SubHeader`, `Avatar`, `CalendarPicker`, `ConfirmDialog`, `Toast`, `TabBar`, `StatusBar`, `LogoutButton` 등)와 `src/components/meetings/`에 나뉘어 있음.
- 즉 디자인시스템 작업이 손댈 가능성이 높은 파일: `src/app/globals.css`(전역 스타일, 충돌 위험 가장 높음), `src/components/ui/*.tsx`, 각 화면의 인라인 `style={{...}}` 사용부.

### 병합 시 확인 절차
1. **병합 전** — 병합해올 브랜치/변경분이 `globals.css`와 `src/components/ui/` 쪽을 얼마나 건드렸는지 `git diff`/`git log --stat`로 먼저 훑어보고, 이 문서의 "확정된 기술 스택"·"후속 작업" 섹션에 적힌 최근 변경사항(참석자 헤더 `attendee` prop, 타임라인 절대좌표 정렬, `.info-section`/`.profile-screen` 스코프 등)과 겹치는 부분이 있는지 확인.
2. **병합 중** — 충돌(conflict)이 나면 임의로 한쪽을 버리지 말고, 두 변경의 의도를 모두 읽은 뒤 통합. 특히 `globals.css`는 전역 파일이라 같은 클래스명을 양쪽에서 다르게 정의했을 가능성이 있으므로 클래스 단위로 대조.
3. **병합 후** — 반드시 순서대로 재검증:
   - `npx tsc --noEmit`, `npx eslint src` 클린 확인
   - `npm run dev -- -p 3311`로 띄운 뒤 데모 로그인 버튼으로 브라우저 재검증 — 특히 이번 세션에서 새로 만든 참석자 헤더(`attendee` chip), 예약 화면 타임라인 정렬, 내 정보 화면 여백, 참석재확인 화면의 `declineCheck` 단계가 디자인시스템 변경 이후에도 깨지지 않았는지 스크린샷으로 확인
   - `PROGRESS.md`를 이어서 갱신(이 섹션에 병합 결과와 발견된 충돌/해결 방법을 기록)

### 진행 방식
- 병합돼서 들어오기 전까지는 이 저장소에서 디자인시스템 관련 파일(`globals.css` 전역 규칙, 공용 UI 컴포넌트의 시각적 스타일)을 임의로 크게 바꾸지 않는 것을 권장 — 병합 충돌 범위를 줄이기 위함. 기능 버그 수정처럼 병합과 무관한 작업은 평소대로 진행해도 무방함.

## 알아두면 좋은 점 (재발 방지용 메모)
- 브라우저 자동화로 여러 사용자를 테스트할 때 **새 탭을 열어도 쿠키는 공유됨** — 같은 탭에서 로그아웃 후 재로그인해야 함
- 네이티브 `<input type="date">`/`<input type="datetime-local">`에 자동입력할 때 처음 클릭한 세그먼트가 항상 "연도"가 아닐 수 있음 — 클릭 후 스크린샷으로 어느 세그먼트가 선택됐는지 확인하고 타이핑할 것
- Prisma 스키마를 바꾸면 `npx prisma migrate dev --name <이름>` 필수(자동 반영 안 됨)
- `npx next build` 시 jose 패키지의 CompressionStream/DecompressionStream 관련 Edge Runtime 경고가 뜨는데, 이건 JWE(암호화 JWT) 전용 코드 경로이고 이 프로젝트는 서명(JWS)만 쓰므로 무시해도 됨
