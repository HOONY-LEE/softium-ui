# softium-ui 구조 리뷰 — 개선점 · 배포 준비도 · 반응형 지침

> 2026-07 시점 전체 코드베이스 진단. 실제 코딩보다 **구조 개선 방향과 지침**을 정리한 문서.
> 각 항목은 우선순위(🔴 배포 전 필수 / 🟡 곧 해야 함 / 🟢 여유 있을 때)로 표시.

---

## 1. 현재 구조 진단

```
packages/
  styles/         CSS-only. 토큰(tokens) + 테마(라이트/다크) + opt-in base. 빌드 없음.
  table-core/     headless 코어 (DOM 무지). 어댑터/파생/export 로직. ✅ 테스트 있음.
  table-react/    useTable + 스타일드 컴포넌트 + 셀 렌더러 + i18n.
  table-styles/   CSS-only. 테이블 스타일. flat CSS 번들.
  sheet/          A1 스프레드시트 + 수식 엔진(engine.ts) + 서식 툴바. ← table-react에서 분리(item 2)
  calendar/       월/주/일/연 캘린더 + 이벤트 모달 + 반복 일정. flat CSS 번들.
  ui/             Button, AppShell(사이드바/헤더/테마토글). flat CSS 번들.
apps/
  playground/     Vite 데모. 패키지의 dist를 소비.
```

**잘 되어 있는 것들** (유지할 것):
- core/react/styles 3층 분리, headless 코어에만 테스트 집중 — TanStack식 구조 그대로 좋음.
- 토큰 CSS(`--sft-*`) 일원화, `data-theme` + `prefers-color-scheme` 폴백의 다크모드 설계.
- ESM+CJS+d.ts (tsup), `sideEffects` 선언, peer react ^18||^19 — 패키징 기본기는 갖춰짐.
- 로드맵 문서(GOOGLE_SHEETS_PARITY.md, CALENDAR_TASKS.md)에 구현 노트/버그 교훈 축적.

**구조적으로 어긋난 지점**:

| # | 문제 | 내용 |
|---|------|------|
| S1 | ✅ **[해결됨 — item 2]** Sheet가 table-react 안에 있던 문제 | `@softium/sheet` 패키지로 분리 완료. table-react 번들 152 KB → 69 KB, sheet는 82 KB 독립 패키지(dnd-kit 미포함). table-react 공개 타입에서 Sheet 제거, playground는 `@softium/sheet`에서 import. Sheet CSS도 table.css에서 sheet 패키지로 이동. |
| S2 | 🟡 **Sheet.tsx 단일 파일 비대화 (부분 해결)** | item 2에서 순수 조각(`types.ts`/`constants.ts`/`series.ts`) + `engine.ts`를 분리해 Sheet.tsx를 ~1,830줄로 축소. **남은 것**: 선택/편집/클립보드/채우기/리사이즈 상태머신의 훅 분해(`useSelection`/`useClipboard`/`useFillHandle`/`useResize`) + `SheetToolbar` 컴포넌트화 — 이건 상태 스레딩 위험이 커서 **T9(주소 리맵) 착수와 함께** 하는 게 이득(리맵이 클립보드/수식/서식 전부를 건드리므로 그때 한 번에 재구성). |
| S3 | 🟡 **스타일 배포 패턴 3종 혼재** | ① `@softium/styles`(토큰, CSS-only 패키지) ② `@softium/table-styles`(별도 CSS 패키지, table-react와 의존 관계 없음) ③ calendar/ui(패키지 안에 styles.css 동봉). 신규 사용자가 "테이블 스타일은 왜 따로 설치?"에서 반드시 헤맴. → **③으로 통일 권장**: table-styles의 내용을 table-react(분리 후엔 sheet 패키지)의 `./styles.css` export로 흡수하고 table-styles는 deprecated 별칭으로 유지. |
| S4 | 🟡 **i18n 패턴 불일치** | table-react는 messages 주입식(locale 객체), calendar는 `pick(language, ko, en)` 하드코딩. 제3언어(ja/zh) 추가가 캘린더에서는 소스 수정 없이 불가능. → calendar도 messages 딕셔너리 주입 + ko/en 내장 기본값 구조로 전환. |
| S5 | 🟢 **undo/redo 중복 구현** | Sheet(스냅샷 스택)와 Calendar(useCalendar 내 past/future)가 같은 패턴을 따로 구현. → `@softium/core-utils` 같은 내부 패키지로 `useHistory<T>` 추출하면 T-계열/C-계열 태스크에서 반복 구현 제거. 급하지 않음. |
| S6 | 🟢 **lucide-react가 3개 패키지의 dependency** | 사용자 앱에 이미 lucide가 있으면 버전 이중화 가능. ERP 라이브러리 특성상 아이콘 수가 적으니(수십 개) **인라인 SVG로 내재화 → 외부 아이콘 dep 0** 이 장기적으로 가장 안전. 차선: peerDependency + peerDependenciesMeta.optional. |
| S7 | 🟢 **접근성 미세 공백** | Sheet 격자가 `role="grid"`만 있고 `role="row"/"gridcell"`, `aria-selected`, `aria-rowcount` 없음. 키보드 내비는 잘 되어 있으므로 롤/상태 어트리뷰트만 보강하면 됨. |

---

## 2. npm 배포 준비도 (다른 사람이 설치했을 때 문제없는가)

현재 상태로 `pnpm publish`하면 **설치는 되지만 실사용에서 걸리는 것들**:

| # | 문제 | 처방 |
|---|------|------|
| P1 | 🔴 **CSS의 bare import** — `@softium/calendar/styles.css`가 `@import "@softium/styles"`를 함 | Vite/Next(webpack css-loader)는 해석하지만, ①CDN/`<link>` 직접 사용 ②postcss 단독 파이프라인 ③일부 구형 번들러에서 깨짐. → 빌드 단계에서 **플랫하게 번들된 단일 CSS**(`dist/styles.css`, import 구문 없이 인라인)를 추가 제공하고 exports에 `"./styles.css"`로 그걸 가리키게. lightningcss/postcss-import 한 줄이면 됨. |
| P2 | 🔴 **`publishConfig.access` 없음** | `@softium/*` 스코프 패키지는 npm 기본이 private publish 거부. 각 package.json에 `"publishConfig": { "access": "public" }` 필요. |
| P3 | 🔴 **LICENSE 파일 부재** | `"license": "MIT"` 선언만 있고 파일이 없음. 루트 + 각 패키지 `files`에 LICENSE 포함. |
| P4 | 🔴 **패키지별 README 없음** | npm 페이지가 비어 보임. 각 패키지에 설치→스타일 import→최소 예제 3단계짜리 README라도 필수. |
| P5 | 🔴 **`workspace:*` 의존** | `pnpm publish`는 자동 치환하지만 `npm publish`로 올리면 그대로 나가서 설치 불가 패키지가 됨. → **changesets 도입**(버전·체인지로그·publish 순서 자동화)이 정석. 배포는 반드시 pnpm 경유. |
| P6 | 🟡 **버전 하드코딩** — 4개 패키지 소스에 `export const VERSION = '0.0.0'` | package.json 버전과 어긋나게 방치될 것. tsup `define`으로 빌드타임 주입하거나 제거. |
| P7 | 🟡 **RSC 경계 없음** | Next.js App Router에서 서버 컴포넌트로 import하면 hooks 때문에 에러. tsup `banner: { js: '"use client";' }` 한 줄로 해결 (react 의존 패키지 3종에). |
| P8 | 🟡 **React 19 peer 선언 vs 미검증** | `^18 || ^19`로 선언했지만 devDeps/playground는 18로만 테스트. CI 매트릭스에 19 추가하거나, 검증 전까지 peer 범위를 ^18로 좁히는 게 정직함. |
| P9 | 🟡 **터치 미지원** (아래 §3) | "설치했는데 아이패드에서 드래그가 안 돼요"가 첫 이슈로 들어올 것. 최소한 README에 현재 포인팅 디바이스 요구사항 명시. |
| P10 | 🟡 **테스트 공백** | table-core 외 전부 `--passWithNoTests`. 특히 `sheet/engine.ts`(수식 엔진)는 **순수 함수라 테스트 비용이 가장 낮고 회귀 위험이 가장 높은 곳** — 함수별 케이스 + `shiftFormula` + 에러 코드만이라도 vitest로 고정 권장. 지금까지의 검증이 전부 수동 브라우저 확인에 의존하고 있어 릴리스 후 리팩터가 위험. |
| P11 | 🟢 **메타데이터** | `repository`/`homepage`/`bugs`/`keywords`/`author` 전부 없음. npm 검색 노출·신뢰도에 영향. |
| P12 | 🟢 **CI 부재** | GitHub Actions: `pnpm i → typecheck → test → build` + changesets release 워크플로. dist가 gitignore이므로 배포는 CI에서만 나가는 구조가 안전. |

**권장 배포 순서**: P2·P3·P5(changesets) → P1(CSS 번들) → P4(README) → P7(use client) → `0.1.0` 배포 → P8/P10은 0.2.x 목표.

---

## 3. 반응형 현황과 지침

### 현황 요약

| 패키지 | 상태 |
|--------|------|
| ui (AppShell) | ✅ 잘 됨 — 1024px 태블릿 레일, 768px 모바일 드로어+오버레이 |
| table | 🟡 부분 — fit 모드(컬럼 축소)/scroll-x 옵트인 구조는 좋음. 720px에서 pager 라벨 숨김뿐. 툴바·필터행 좁은 화면 대응 없음 |
| calendar | 🟡 이벤트 OK / 레이아웃 미흡 — **포인터/터치 입력은 item 3으로 해결**(주·일 뷰 이벤트 이동·리사이즈 터치 동작, 빈 영역 스크롤). 연간 그리드 축소만 있고 툴바·월간 뷰 좁은-폭 레이아웃은 여전히 미흡(B-2). |
| sheet | 🟡 입력 OK / 레이아웃 유지 — **터치 스크롤·탭선택·핸들 드래그 item 3으로 확보**(격자 스크롤, 채우기/리사이즈 `touch-action`, coarse 히트영역). 좁은-폭 레이아웃 규칙은 아직 없음(고정 폭 격자 + 가로 스크롤). |

### 지침 (구현 시 이 순서·원칙으로)

**R1. 브레이크포인트를 상수로 일원화** 🔴
지금 640/720/768/900/1024가 파일마다 제각각. CSS 변수는 media query 조건에 못 쓰므로, `tokens.css` 주석 + 문서로 **공식 3단계를 고정**하고 전 패키지가 따르게: `sm=640` / `md=768` / `lg=1024`. 기존 720/900은 다음 스타일 수정 때 근접 단계로 흡수.

**R2. viewport가 아니라 컨테이너 기준으로** 🟡
ERP 특성상 테이블·캘린더는 대시보드 카드 "안"에 들어감 — 화면이 넓어도 위젯은 좁을 수 있음. 신규 반응형 규칙은 `@container`(container query)로 작성하는 것을 기본으로: 각 최상위 래퍼(`.sft-table`, `.sft-cal`, `.sft-sheet-wrap`)에 `container-type: inline-size` 지정. 기존 media query는 페이지 레벨 요소(AppShell)에만 유지.

**R3. 포인터 이벤트로 전환 (터치 지원의 전제)** ✅ **완료 (item 3)**
Sheet + 캘린더 3개 뷰의 `mouse*` 드래그를 pointer로 전환. 실제 적용된 규칙(위 B-1-a):
- `onMouseDown` → `onPointerDown`, window `mousemove/mouseup` → `pointermove/pointerup`. (mouse는 pointer로 그대로 발화하므로 데스크톱 동작 무변화.)
- **setPointerCapture는 쓰지 않음** — 터치는 어차피 암묵 캡처되고, 타깃 추적을 `onMouseEnter`(mouse/pen 컴팩트 이벤트) 또는 컬럼 기하학(getBoundingClientRect)으로 하기 때문. 캡처를 걸면 `onMouseEnter` 기반 추적이 깨짐.
- **면 드래그**(범위선택/빈영역 생성)는 `pointerType==='touch'` 게이팅 → 터치는 스크롤+탭. **핸들 드래그**(채우기/리사이즈/주·일 이벤트이동)는 터치 허용 + 요소에 `touch-action:none`.
- `@media (pointer: coarse)`로 리사이즈·채우기 히트영역 확대(시트 9→22px, 캘린더 리사이즈 6→14px).
- 참고: 시트 헤더 리사이저는 원래부터 PointerEvent였음(이번에 나머지를 그 패턴에 맞춤).

**R4. 캘린더 모바일 규칙** 🟡
- 툴바: 640px 이하에서 2줄 랩(제목+nav / 필터+뷰탭), 검색은 아이콘→풀폭 확장형 유지.
- 월간 뷰: 640px 이하에서 이벤트 칩의 시간 라벨 숨기고 제목만, 또는 dot 밀도 모드(점 + 탭하면 그 날의 리스트). `--sft-cal-event-h` 토큰 하나로 높이가 일원화되어 있으므로 밀도 전환이 쉬움.
- 주간 뷰: 7열 유지가 불가능한 폭에서는 3일 뷰로 축소하는 것이 정석이지만 대공사 — 1차로는 가로 스크롤 허용이 현실적.
- C15(반응형/모바일) 태스크가 이 항목과 동일 — 위 R1~R3 선행 후 착수.

**R5. 시트 모바일 규칙** 🟢
엑셀도 모바일 편집은 별도 UX. 현실적 목표는: ① 가로/세로 터치 스크롤이 막히지 않을 것 ② 탭=선택, 더블탭=편집이 동작할 것 ③ 드래그 채우기/리사이즈는 데스크톱 전용으로 명시. R3(포인터 전환)만 되면 ①②는 거의 따라옴.

**R6. 테이블** 🟢
구조(fit/scroll-x)는 이미 옳음. 남은 것: 툴바 버튼들이 좁은 폭에서 오버플로 메뉴로 접히는 패턴, 필터행 가로 스크롤 동기화 확인 정도.

---

## 4. 남은 작업 태스크 통합 보드

상세 스펙은 각 로드맵 문서 참조. 여기는 우선순위 통합 뷰만.

### 릴리스 엔지니어링 (신규 — 위 §2에서 도출)
- [x] R-1 🔴 changesets 도입 + publishConfig/LICENSE/README/메타데이터 — **완료**. `.changeset/config.json`(access public, playground ignore) + 루트 스크립트(changeset/version/release), 6개 패키지 전부 publishConfig·repository(directory)·keywords·author·homepage·bugs, 루트+패키지별 LICENSE, 패키지별 README. `pnpm changeset status`로 6개 → 0.1.0 검증. `first-public-release.md` 체인지셋 시드.
- [x] R-2 🔴 CSS 플랫 번들 산출물 — **완료**. `scripts/bundle-css.mjs`(postcss + postcss-import)가 bare `@import "@softium/styles"`를 인라인해 `@import` 0개인 flat CSS 생성. table-styles→`dist/index.css`, calendar/ui→`dist/styles.css`. exports를 flat dist로 교체(source는 `./source.css`로 유지). 플레이그라운드에서 시트·캘린더 렌더 확인.
- [x] R-3-a 🟡 `"use client"` — **완료**. tsup `banner`는 treeshake rollup 패스가 제거하므로(경고 발생) `scripts/add-use-client.mjs`로 빌드 후 프리펜드. calendar/table-react/ui의 esm·cjs 첫 줄에 `"use client"` 확인.
- [ ] R-3-b 🟡 VERSION 빌드타임 주입 — 미완(소스 `VERSION='0.0.0'` 하드코딩 4곳 잔존). tsup `define`로 주입 예정. 배포 차단 요소는 아님.
- [ ] R-4 🟡 GitHub Actions CI (typecheck/test/build/release)
- [ ] R-5 🟡 engine.ts 수식 엔진 단위 테스트
- [ ] R-6 🟢 React 19 검증 매트릭스

### 구조 (신규 — 위 §1에서 도출)
- [x] A-1 🔴 `@softium/sheet` 패키지 분리 — **완료**. table-react에서 sheet/ 이관, CSS 분리, types/constants/series/engine 모듈 분해, table-react·playground 재배선. 번들 152→69 KB(table-react)+82 KB(sheet). 훅 단위(상태머신) 분해는 S2대로 T9와 함께 잔여.
- [ ] A-2 🟡 스타일 배포 패턴 통일 (styles.css 동봉형으로)
- [ ] A-3 🟡 calendar i18n 주입식 전환
- [ ] A-4 🟢 useHistory 공용화, 아이콘 인라인화, Sheet 격자 ARIA 보강

### 반응형 (위 §3)
- [x] B-1-a 🔴 **포인터 이벤트 전환 — 완료 (item 3)**. Sheet + 캘린더 3개 뷰의 모든 드래그 시작을 `onPointerDown`, window 리스너를 `pointermove`/`pointerup`로 전환. 규칙: **면(面) 드래그**(시트 범위선택, 캘린더 빈 영역 드래그-생성)는 `pointerType==='touch'`면 시작 안 함 → 터치는 네이티브 스크롤 + 탭선택. **핸들 드래그**(시트 채우기/리사이즈, 주/일 뷰 이벤트 이동·리사이즈 — 기하학 기반이라 터치 캡처에도 동작)는 터치 허용 + 해당 요소에 `touch-action:none`. 월간 뷰 이벤트 이동은 `onMouseEnter` 타깃추적 의존이라 mouse/pen 전용(터치 탭=편집). `@media (pointer:coarse)`로 리사이즈/채우기 히트영역 확대. 검증: 시트 채우기 드래그(수식 시프트 정상)·터치 셀-press 게이팅(단일셀 유지, 스크롤 보존)·월간 이벤트 이동(스코프 다이얼로그)까지 브라우저 확인.
- [ ] B-1-b 🔴 브레이크포인트 상수 통일 (640/768/1024) — 미완. 현재 640/720/768/900/1024 혼재.
- [ ] B-2 🟡 캘린더 툴바/월간 뷰 모바일 규칙, 컨테이너 쿼리 도입
- [ ] B-3 🟢 시트 터치 스크롤/탭 편집(기반은 B-1-a로 확보), 테이블 툴바 오버플로

### Sheet 기능 (GOOGLE_SHEETS_PARITY.md)
완료: 서식 전반(T1–T6), 클립보드 전체(T7: ⌘C/V/X/⇧V), undo 확장(T10), 함수 확장(T11), 상대/절대 참조(T12), Σ 툴바.
- [ ] T8 우클릭 컨텍스트 메뉴 (기존 onGridCut/Copy/Paste 진입점만 연결)
- [ ] T9 행/열 삽입·삭제·이동 (주소 리맵 + 수식 리라이트 — **S2 훅 분해와 함께 착수 권장**)
- [ ] T13 정렬·필터 / T14 데이터 유효성 / T15 틀 고정 / T16 줌 / T17 조건부 서식 / T18 찾기·바꾸기 / T19 메모 / T20 링크·차트(후순위)

### Calendar 기능 (CALENDAR_TASKS.md)
완료: 4개 뷰, 반복(생성/삭제/이동 스코프 분기), 드래그 이동·리사이즈·생성 전체(C1~C1-d, C2), 키보드 내비 전체(C3~C3-c), undo/redo(C4), 공휴일(C11), 검색·카테고리 필터.
- [ ] C5 종일(all-day) 일정 / C6 RRULE 고급(월간 n번째 요일 등 — WEEKLY byweekday 앵커 한계도 여기서 재설계) / C7 타임존·주 시작요일 / C8 겹치는 시간 이벤트 나란히 배치 / C9 iCal import/export / C10 controlled props / C11-b 로케일 공휴일 세트 / C12 검색 고도화 / C13 현재시각 인디케이터 / C14 연간 뷰 히트맵 / C15 반응형(→ B-2와 동일 작업)

---

## 5. 요약 — 지금 당장 정하면 좋은 3가지

1. **배포 게이트**: changesets + publishConfig + LICENSE/README + 플랫 CSS 번들이 끝나기 전에는 publish 금지. 이 4개가 "다른 사람이 받아서 쓸 때" 문제의 90%.
2. **Sheet 분리 시점**: T9(행/열 삽입·삭제)가 Sheet 전체 상태를 건드리는 가장 큰 공사이므로, 그 **직전**이 패키지 분리+파일 분해의 마지막 적기.
3. **반응형의 첫 단추는 CSS가 아니라 이벤트**: 포인터 이벤트 전환(R3) 없이는 어떤 미디어쿼리를 넣어도 터치 기기에서 라이브러리가 동작하지 않음. B-1을 반응형 트랙의 첫 태스크로.
