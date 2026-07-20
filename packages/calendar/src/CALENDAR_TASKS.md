# Calendar — 기능 로드맵 / Task List

> `@softium/calendar` 컴포넌트를 확장하기 위한 **작업 목록**입니다. 각 태스크는
> 독립 착수 가능하도록 목표·참조 동작·구현 위치·수용 기준(acceptance)을 명시합니다.
> 자동화 에이전트가 `[ ]` 항목 하나를 골라 그대로 구현할 수 있도록 작성되었습니다.

## 코드 지도

- 진입점 / 상태: `src/Calendar.tsx`, `src/hooks/useCalendar.ts`
- 뷰: `src/views/{MonthView,WeekView,DayView,YearView}.tsx`
- 모달/편집: `src/components/{EventModal,RecurrenceSection,DeleteOptionsDialog}.tsx`
- 카테고리: `src/components/{CategoryFilter,CategoryItem}.tsx`, 탭: `SegmentTabs.tsx`
- 유틸: `src/utils/{date,events,color}.ts` (반복 전개는 `events.ts`의 `expandRecurringEvents`)
- 타입: `src/types.ts` (`CalendarEvent`, `Category`, `Recurrence`, `PreviewEvent`, `ViewType`)
- 스타일: `src/styles/calendar.css` (토큰 `--sft-*` 만 사용, 하드코딩 색 금지)
- 데모/검증: `apps/playground/src/pages/CalendarPage.tsx`
- 빌드: `pnpm --filter @softium/calendar build` → 프리뷰 새로고침
- 타입체크: `npx tsc --noEmit -p packages/calendar/tsconfig.json`

## 셀 아이템 규격 (중요 — 회귀 방지)

월(Month) 셀 내부의 모든 아이템은 **동일 높이**여야 합니다: 날짜 머리글
(`__cellhead`) · 기간 일정 바(`__bar`) · 하루 일정 칩(`__chip`) · `+N개`
더보기(`__more`) · `+ 새 일정` 추가 버튼(`__add`). 높이는 CSS 토큰
`--sft-cal-event-h`(현재 22px)와 `MonthView.tsx`의 `EVENT_H` 상수로 일원화되어
있으며 둘은 **항상 함께** 바꿔야 합니다. 기간 일정 드래그 미리보기는 셀 배경을
칠하지 않고 `__bar--drag`(“+ 새 일정”) 바가 드래그 범위만큼 늘어나는 방식입니다.

## 현재 상태 (구현 완료)

- [x] 월/주/일/연 4개 뷰, 뷰 전환 세그먼트 탭
- [x] 일정 생성/편집 모달(`EventModal`), 카테고리, 카테고리 필터
- [x] 반복 일정(DAILY/WEEKLY/MONTHLY/YEARLY, interval, byweekday, until/count) + 전개
- [x] 반복 일정 삭제 옵션(이 일정만/이후 전체/전체) 다이얼로그
- [x] 월 뷰: 기간 일정 레인 패킹, 하루 일정 칩, `+N개` 더보기(행 펼치기)
- [x] 월 뷰 드래그로 기간 일정 생성 — `+ 새 일정` 바가 드래그 범위만큼 확장
- [x] 셀 아이템 높이 규격 일원화(위 “셀 아이템 규격” 참조)
- [x] 다국어(ko/en), 토큰 기반 라이트/다크 테마
- [x] **C4** 실행취소/다시실행 — `useCalendar`의 `setEvents`가 모든 변이 전 스냅샷을
      찍어 `past`/`future` 스택에 쌓음(add/update/delete/move 전부 자동 커버).
      툴바 버튼 + ⌘Z/⌘⇧Z(또는 Ctrl). input/textarea 포커스 중엔 가로채지 않음.
- [x] **C1** 월 뷰 드래그로 일정 이동(반복 없는 일정만 스코프) — 칩/바를 mousedown 후
      4px 이상 움직이면 이동 모드로 전환, 대상 날짜 셀에 `data-movetarget` 아웃라인
      표시, mouseup 시 `date`/`endDate`를 델타만큼 이동. 움직이지 않았다면 기존
      클릭(편집 모달)이 그대로 동작 — `justMovedRef`로 구분.
- [x] **C11** 공휴일 표시 — `Calendar`의 `holidays?: Holiday[]` prop → `MonthView`로
      전달. 날짜 헤더(`__cellhead`) 안에 이름 라벨(빨강, 일요일과 동일 톤), 숫자도
      일요일 색상 적용. 별도 아이템 행을 추가하지 않아 셀 아이템 규격을 건드리지 않음.
- [x] **C3** 키보드 내비게이션(월 뷰) — roving tabIndex(오늘 날짜가 최초 포커스),
      방향키로 상하좌우 하루/한 주씩 이동, Enter/Space로 포커스된 날짜의 생성 모달
      오픈. 그리드 `role="grid"`, 셀 `role="gridcell"` + `aria-label`(날짜, 공휴일명
      포함) + `aria-current`.
- [x] **C2** 주/일 뷰 드래그로 시간대 일정 생성 — 타임그리드 빈 영역을 mousedown+드래그
      하면 15분 스냅 단위로 시작~끝을 잡는 draft 바(`__timeevent--draft`, 월 뷰의
      `+ 새 일정` 고스트와 동일 톤)가 커지고, 놓으면 그 시간으로 `EventModal`이 열림.
      `utils/date.ts`의 `minutesFromY`/`snapMinutes`/`minutesToHHMM`/`hhmmToMinutes`로
      픽셀↔분 변환을 일원화(월 뷰의 `ROW` 상수 방식과 대응).
- [x] **C1-b (부분)** 주/일 뷰 드래그 이동 · 리사이즈(비반복 일정만) — 이벤트 칩을
      세로로 드래그하면 `startTime/endTime`이 델타만큼 함께 이동(기간 보존), 상/하단
      리사이즈 핸들(`__timeevent__resize`)로 시작 또는 끝만 개별 조정(최소 15분).
      월 뷰의 `moveRef`/`justMovedRef` 패턴을 그대로 적용해 클릭(편집)과 구분.
      ⚠️ 구현 중 실제 버그 발견·수정: onUp에서 `setState(prev => { 부수효과(); return null })`
      형태로 `onEventTimeChange`를 호출했더니 React 18 StrictMode가 updater 함수를
      두 번 실행해 히스토리가 2건씩 쌓였음 — updater 안에서는 절대 부수효과를 호출하지
      않고, `createPreviewRef`/`livePreviewRef`(일반 ref)에 최신값을 미러링해 `onUp`이
      그 ref를 직접 읽어 부수효과를 실행하도록 수정. **앞으로 이 패턴(드래그 종료 시
      마지막 미리보기 값을 읽어 콜백 호출)을 추가할 때는 항상 ref로 읽고, setState
      updater 안에 부수효과를 넣지 말 것.**
      **남은 범위**: 반복 일정 드래그 시 "이 일정만/이후" 분기 — 아래 **C1-c**로 분리.
- [x] **C1-c (부분)** 월 뷰 기간 바 좌우 리사이즈 & 주 뷰 요일 간(cross-day) 드래그
      — 기간 바의 시작/끝 날짜 세그먼트에만 좌/우 리사이즈 핸들(`__bar-resize`)을
      렌더링, 드래그해 호버한 날짜 셀로 `date`/`endDate`를 개별 조정(`onEventResize`).
      주 뷰는 'move' 모드 드래그 중 `document.elementFromPoint` 대신 각 컬럼 ref의
      `getBoundingClientRect()`로 커서 X좌표가 속한 컬럼을 매 `mousemove`마다
      재계산(`findColIndexAtX`), 컬럼이 바뀌면 원래 컬럼의 칩을 숨기고 호버 중인
      컬럼에 실제 색상/제목을 반영한 고스트를 렌더링, 헤더에 `data-movetarget`
      아웃라인 표시. 놓으면 `onEventTimeChange`의 4번째 인자로 새 날짜 전달.
      **남은 범위**: 반복 일정 이동 분기만 — 아래 **C1-d**.
      ⚠️ 실제 버그 발견·수정 (반드시 남겨야 하는 교훈):
      1) **NaN 커밋 방지** — 드래그 도중 컬럼 `rect.height`가 일시적으로 0이 되는
         순간(레이아웃 스래싱 등, 이 프리뷰 환경에서 실측함) 그대로 두면 `NaN`/`Infinity`
         분(分) 값이 `livePreview`에 저장되고 mouseup 시 그대로 커밋되어 시간이
         `"NaN:NaN"`처럼 깨진 채 저장됨. `onMove`에서 `rect.height <= 0`이면 그 틱을
         버리고, `onUp` 커밋 직전에도 `Number.isFinite(startMin/endMin)`를 한 번 더
         검증(2중 방어) — `WeekView.tsx`/`DayView.tsx` 둘 다 적용.
      2) **키보드 Enter 이벤트 버블링** — 월 뷰에서 칩/바에 포커스 후 Enter를 누르면
         칩의 `onKeyDown`이 `onEventClick`을 호출하지만 `stopPropagation()`이 없어서
         그 Enter 키 이벤트가 그리드 컨테이너의 `handleGridKeyDown`까지 버블링해
         "포커스된 날짜에 새 일정 생성"을 **동시에** 트리거 — 두 setState가 배칭되어
         나중 것이 이겨서 편집 대신 빈 새 일정 모달이 열림. 칩/바(월/주/일 뷰 전부)의
         Enter/Space 핸들러에 `e.stopPropagation()` 추가로 해결.
      **패턴 노트**: 그리드 레벨 키보드 핸들러와 그 안의 개별 아이템 키보드 핸들러를
      함께 둘 때는 항상 아이템 쪽에서 `stopPropagation()`을 잊지 말 것 — 안 그러면
      "아이템용 Enter"가 "그리드용 Enter"와 동시에 발동해 나중 setState가 이긴다.
- [x] **C3 확장** 전역 키보드 단축키 + 일정 칩/바 포커스 가능 — `Calendar.tsx`의
      ⌘Z 이펙트에 `t`(오늘)/`m`/`w`/`d`/`y`(뷰 전환) 추가(입력창 포커스·모달 열림 중엔
      비활성). 월/주/일 뷰의 이벤트 칩·바에 `role="button"` `tabIndex={0}`
      `aria-label` + Enter/Space→편집 추가(연 뷰는 원래 네이티브 `<button>`이라 이미
      키보드 접근 가능, `aria-label`만 보강).
      **남은 범위**: 주/일/연 뷰에 월 뷰와 동일한 grid/gridcell 방향키 roving-tabIndex
      패턴 적용 — 아래 **C3-c**에서 완료.
- [x] **C3-c** 주/일/연 뷰 방향키 내비게이션 — `DayView`는 24개 시간 슬롯에
      `focusedHour`(`number | null`, 마운트 시 포커스 강탈 방지를 위해 null로 시작)
      + roving tabIndex, ↑/↓로 시간 이동. `WeekView`는 `{dayIndex, hour}` 좌표로 동일
      패턴, ←/→=요일, ↑/↓=시간(둘 다 `MonthView`의 `focusedIndex`/`cellRefs` 골격
      그대로 재사용). `YearView`는 12개의 가변 길이 미니 그리드가 있어 하나의 평탄한
      인덱스로 관리하기 번거로워, 상태 대신 `data-daykey`(YYYY-MM-DD) 속성 +
      `containerRef.querySelector`로 인접 날짜 버튼을 직접 찾아 `.focus()`하는 방식
      채택 — 월 경계(예: 7/31→8/1)를 넘어가도 올바르게 이동. 연도 경계는 넘지 않음
      (다음 해로 자동 전환하려면 `onViewChange`/`currentDate` 갱신이 필요해 범위 밖).
      Enter/Space는 네이티브 `<button>` 기본 동작이라 별도 구현 불필요.
- [x] **C1-c (전체)** — 위 항목에서 남았던 부분 없음, 반복 일정 이동 분기만 남음(아래
      **C1-d**).
- [x] **C1-d** 반복 일정 드래그 이동 시 "이 일정만/이후/전체" 분기 — 월/주/일 뷰의
      `startEventMove`/`beginMove` 가드를 "리사이즈만 차단"으로 완화(이동은 허용,
      `resizable`/`data-movable="true"`로 이름 정리). `Calendar.tsx`의
      `handleEventMove`(월 뷰)·`handleEventTimeChange`(주/일 뷰)는 대상이
      `event.recurrence || event.isRecurringInstance`이면 즉시 커밋하지 않고
      `pendingMove`(master, instanceDate, newDate, newStartTime?, newEndTime?)만
      세팅 → 새 `RecurrenceScopeDialog`(이 일정만/이후 모든 일정/모든 반복 일정)를
      렌더링해 사용자가 스코프를 고르면 `handleRecurrenceScopeConfirm`이 적용:
      - **all**: `master`의 `date`/`endDate`/`startTime`/`endTime`을 델타만큼 갱신
        (기존 비반복 이동과 동일 로직).
      - **this**: master에 `exdate`로 원래 발생일 추가 + 새 날짜/시간의 독립
        (비반복) 이벤트 하나를 **같은 `setEvents` 콜백 안에서** 함께 커밋.
      - **following**: `occurrencesInRange(master.date, recurrence, master.date,
        instanceDate-1일)`로 분기 이전 발생 횟수를 세어, master는
        `recurrence.until = instanceDate-1일`로 끝내고, 새 시리즈(같은 freq/
        interval/byweekday, `count`가 있었다면 `count - 경과분`)를 새 날짜에서
        시작 — 이 역시 **하나의 `setEvents` 콜백**으로 커밋.
      ⚠️ 실제 버그 발견·수정:
      1) **exdate 추가 + 신규 이벤트 생성을 `setEvents` 한 번 + `addEvent` 한 번,
         총 두 번 호출**했더니 실행취소가 2단계로 쪼개져 `handleDelete`(1단계)와
         일관성이 깨짐 — `addEvent`가 하는 일(새 `CalendarEvent` 객체 + id 부여)을
         `setEvents((prev) => [...prev.map(...), { id: ..., ... }])` 형태로 인라인해
         **단일 `setEvents` 호출**로 합침. 이런 "여러 필드를 한 번에 바꾸는" 로직은
         항상 setEvents 호출 횟수 = 실행취소 단계 수라는 점을 기억할 것.
      2) **TS 내로잉이 클로저를 못 건너뜀** — `if (moveScope === 'all' ||
         !master.recurrence) {...} else if (moveScope === 'following') {...}`
         구조에서 `else if` 블록 안, 그것도 `setEvents(prev => ...)` 콜백 내부에서
         `master.recurrence`를 다시 쓰면 `Recurrence | undefined`로 되돌아가 타입
         에러 — 멤버 접근(`obj.prop`)에 대한 narrowing은 함수 경계를 넘지 않기
         때문. `const recurrence = master.recurrence;` 로 로컬 변수에 한 번
         담아서 그 식별자를 쓰면 해결(식별자 narrowing은 클로저 안에서도 유지됨).
      3) **월간 반복 다이얼로그를 삭제 다이얼로그와 같은 위험(danger, 빨강) 색으로
         재사용**하면 "이동"이 파괴적 동작처럼 보임 — `DeleteOptionsDialog`를 고치는
         대신 별도 컴포넌트 `RecurrenceScopeDialog`를 새로 만들고, 선택 항목 스타일에
         `sft-cal-delopt--accent` 수정자 클래스(파랑/`--sft-cal-accent`)를 추가해
         danger 대신 accent 톤을 쓰도록 분리.
      **알려진 한계**: WEEKLY+`byweekday` 시리즈(예: 월/수/금 반복)를 그 패턴에 없는
      요일(예: 토)로 드롭하면, `occurrencesInRange`가 "드롭한 날짜가 속한 주"부터
      셈을 시작하면서 그 주의 남은 byweekday가 모두 base(드롭한 날짜) 이전으로
      걸러져 첫 주는 건너뛰고 다음 매칭 요일부터 시리즈가 이어짐(드롭한 날짜 자체엔
      아무 발생도 안 보임). 반복 엔진의 기존 anchor 계산 방식에서 비롯된 특성이라
      이번 범위에서 재설계하지 않음 — 향후 **C6**(RRULE 고급화)에서 재검토 대상.
      실제 검증: 브라우저에서 월 뷰 반복 일정을 드래그 → 다이얼로그 오픈 확인,
      "이 일정만"(원본에 exdate 추가 + 새 단일 이벤트 생성), "이후 모든 일정"(원본
      시리즈가 분기 전날로 종료 + 새 시리즈 시작) 각각 실제 커밋 결과를 캘린더
      그리드에서 확인, 실행취소 한 번으로 두 경우 모두 완전히 원상복구됨을 확인.

---

## 우선순위 1 — 상호작용 정확도

현재 우선순위 1(상호작용 정확도)에 남은 항목 없음 — C1 계열(이동/리사이즈/반복 분기)
전부 완료. 다음은 우선순위 2(일정 모델 확장)로 진행.

---

## 우선순위 2 — 일정 모델 확장

### [ ] C5. 종일(all-day) 일정 & 시간대 일정 구분
- **구현**: `CalendarEvent`에 `allDay?: boolean`. 종일은 월 뷰 상단 바 영역과 주/일 뷰
  상단 all-day 레인에 표시. 시간 없는 일정과 종일 일정 구분.
- **수용**: 종일 일정이 타임그리드가 아닌 상단 레인에 표시.

### [ ] C6. 반복 규칙 고급화 (RRULE 준수)
- **현재**: freq/interval/byweekday/until/count.
- **구현**: `BYMONTHDAY`, `BYSETPOS`(예: 매월 셋째 주 화요일), 월별 “n번째 요일”,
  예외일(`exdate`) 편집 UI. `events.ts` 전개 로직 확장, iCal RRULE 문자열 import/export.
- **수용**: “매월 마지막 금요일” 규칙이 정확히 전개.

### [ ] C7. 타임존 & 로케일 주 시작요일
- **구현**: `weekStartsOn`(일/월) 옵션, 로케일별 기본값. 타임존 인식(옵션). 24/12시간
  표기 토글.
- **수용**: 주 시작을 월요일로 바꾸면 헤더/그리드가 일제히 이동.

### [ ] C8. 겹치는 시간대 일정 나란히 배치
- **구현**: 주/일 뷰에서 시간이 겹치는 일정들을 열 분할로 나란히(현재 레인 패킹을
  타임그리드에도 적용).
- **수용**: 같은 시간 3개 일정이 3열로 분할 표시.

---

## 우선순위 3 — 데이터 & 연동

### [ ] C9. iCalendar(.ics) import / export
- **구현**: VEVENT/RRULE 파싱·직렬화(`utils/ical.ts` 신설). 파일 드롭 import, 선택
  일정/전체 export.
- **수용**: 외부 .ics를 읽어 일정 표시, 내보낸 파일이 타 캘린더에서 열림.

### [ ] C10. 제어 컴포넌트화 (controlled props)
- **구현**: `events`/`categories`/`view`/`currentDate`를 제어 prop + `onEventsChange`
  등 콜백으로 노출(현재 initial* 비제어). 호스트 상태와 동기화.
- **수용**: 부모가 `events`를 갱신하면 즉시 반영, 내부 변경은 콜백으로 통지.

### [ ] C11-b. 로케일별 기본 공휴일 세트
- **현재**: `holidays` prop으로 호스트가 직접 공휴일 목록을 넘기는 방식(C11)만 구현됨.
- **구현**: 한국(`ko`) 등 로케일별 기본 공휴일 데이터셋을 패키지에 내장, `holidays`
  미지정 시 `language` prop 기준 자동 적용(연도별 계산 필요 — 음력 공휴일 등 주의).
- **수용**: `holidays` 없이도 로케일 기본 공휴일이 표시됨.

### [ ] C12. 검색 (일정 찾기)
- **현재**: 헤더에 검색 아이콘 존재(동작 미연결 가능성).
- **구현**: 제목/설명 검색 오버레이, 결과 목록→해당 날짜로 이동·하이라이트.
- **수용**: 키워드로 일정 검색 후 클릭 시 그 날짜/일정으로 포커스.

---

## 우선순위 4 — 뷰 다듬기

### [ ] C13. 주/일 뷰 현재시각 인디케이터 & 자동 스크롤
- **구현**: 오늘 컬럼에 “now” 가로선, 진입 시 현재시각으로 스크롤.
- **수용**: 주 뷰 진입 시 현재시각이 보이고 빨간 선 표시.

### [ ] C14. 연(Year) 뷰에서 미니 월 클릭 → 월 뷰 이동, 밀도 히트맵
- **구현**: 미니 캘린더 날짜 클릭 시 해당 월/날짜로. 일정 개수 밀도 표시(옵션).
- **수용**: 연 뷰에서 날짜 클릭 시 월 뷰로 전환.

### [ ] C15. 반응형 / 모바일 레이아웃
- **구현**: 좁은 폭에서 월 뷰 칩 축약(점 표시), 주/일 뷰 우선. 터치 드래그 지원.
- **수용**: 모바일 폭에서 겹침 없이 사용 가능.

## 작업 규칙

1. 한 번에 한 태스크(`[ ]`). 완료 시 `[x]`로 바꾸고 “구현 완료”에도 반영.
2. 셀 아이템 규격(높이 일원화, 드래그 바 방식)을 깨지 않는다 — 회귀 시 위 규격 절 참고.
3. 항상 타입체크 → 빌드 → 프리뷰(`CalendarPage`)에서 실제 동작 검증(스크린샷).
4. 스타일은 토큰만 사용, 접근성 레이블/키보드 유지.
5. 비제어(initial*) → 제어(props) 전환(C10)은 다른 태스크보다 먼저 하면 이후가 쉬움.
