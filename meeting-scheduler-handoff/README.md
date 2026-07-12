# 회의 일정 조율 앱 — Claude Code 구현용 전달 폴더

이 폴더를 그대로 Claude Code(또는 다른 구현 에이전트)에 프로젝트로 전달하면 됩니다.

## 읽는 순서

1. **`docs/project_handoff.md`** — 가장 먼저 읽을 문서. 프로젝트 개요, 17개 화면 목록과 파일 매핑, 핵심 설계 결정, 구현 시 유의사항 요약
2. **`docs/screen_specs.md`** — 화면별 상세 스펙(입력/표시/액션/검증 규칙)
3. **`docs/db_model_mvp.md`** — 데이터 모델(12개 엔티티, ERD 포함)
4. **`wireframes/*.html`** — 17개 화면 와이어프레임(단일 HTML 파일, 실제 동작하는 인터랙션 포함). 각 파일 하단 `.dev-notes` 섹션에 화면별 세부 로직·DB 필드 매핑 정리됨 — 구현 시 반드시 함께 참고
5. **`docs/open_decisions_tracker_reference.md`** — (선택) 설계 과정에서 나온 모든 결정·이슈의 상세 이력. 구현에 필수는 아니지만 "왜 이렇게 됐는지" 근거가 필요할 때 참고

## 화면 파일명 ↔ 화면 번호 매핑

파일명 끝자리 숫자와 와이어프레임 안의 실제 `frame-label`("화면 N") 표기가 다릅니다. 반드시 각 파일을 열어 `frame-label` 값을 확인하거나, 아래 표(= `docs/project_handoff.md`와 동일)를 기준으로 삼으세요.

| 화면 번호 | 파일명 | 이름 |
|---|---|---|
| 화면 1 | `wireframe_05_meeting_list.html` | 내 회의 목록 (탭바) |
| 화면 2 | `wireframe_03_meeting_create_1.html` | 회의 생성 |
| 화면 3 | `wireframe_01_slot_response_1.html` | 슬롯 응답 (필수 참석자용) |
| 화면 4 | `wireframe_02_agenda_1.html` | 안건 등록 |
| 화면 5 | `wireframe_06_dashboard_2.html` | 회의 대시보드 (주최자 전용) |
| 화면 6 | `wireframe_07_mitigation_response_6.html` | 완화요청(변경요청) 응답 |
| 화면 7 | `wireframe_08_manual_adjust_4.html` | 수동 조정 |
| 화면 8 | `wireframe_10_reconfirm_1.html` | 참석 재확인 |
| 화면 9 | `wireframe_09_meeting_detail_3.html` | 회의 상세 |
| 화면 10 | `wireframe_17_meeting_minutes_1.html` | 회의록 · 향후 추진 과제 |
| 화면 11 | `wireframe_11_notifications_1.html` | 알림 (탭바) |
| 화면 12 | `wireframe_04_shortlist_confirm_2.html` | 압축 후보 확인 (선택 참석자용) |
| 화면 13 | `wireframe_12_login_1.html` | 로그인 (앱 진입점) |
| 화면 14 | `wireframe_13_profile_setup_1.html` | 최초 프로필 설정 |
| 화면 15 | `wireframe_14_onboarding_1.html` | 온보딩 (최초 1회) |
| 화면 16 | `wireframe_15_my_info_1.html` | 내 정보 (탭바) |
| 화면 17 | `wireframe_16_reservation_1.html` | 예약 (탭바) |

## 현재 상태

- 17개 화면 와이어프레임 제작 완료
- 전체 화면 통합 재검토 완료(4개 리서치 에이전트 병렬 감사 → 사용자와 하나씩 결정 → 실제 파일 반영)
- 모든 와이어프레임 JS 문법 검증(`node --check`) 통과 + Playwright 헤드리스 렌더링 시 콘솔/페이지 에러 0건 확인
- v2로 남은 확장 범위 없음(회의록·향후 추진 과제까지 v1로 승격 완료) — 이 폴더 하나로 전체 스펙이 완결됨
