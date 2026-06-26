# Claude Code 프로젝트 브리프: ERP Table 라이브러리

> 이 문서를 Claude Code 작업 디렉토리 루트에 `SPEC.md` (또는 초기 프롬프트)로 넣고 시작한다.
> 장기 목표는 ERP 화면 전용 React UI 라이브러리이며, **Table이 그 첫 번째 컴포넌트**다.
> 한 번에 다 만들지 말고, 아래 Phase 순서대로 진행한다. 각 Phase 끝마다 멈추고 검증한다.

---

## 0. 프로젝트 목표 (한 문장)

> **"어떤 서버 데이터가 들어와도 그릴 수 있고, 엑셀처럼 컬럼을 조작할 수 있으며, 기본 상태로도 아름다운 ERP용 React 테이블 라이브러리."**

TanStack Table의 우아한 추상화(로직과 뷰의 분리)를 따르되, headless가 주는 보일러플레이트 부담을 없애기 위해 **즉시 쓸 수 있는 스타일드 레이어를 함께 제공**한다. 이 둘 사이의 빈틈이 우리의 차별점이다.

---

## 1. 설계 철학 (코드의 모든 결정에 우선한다)

1. **추상화 우선.** 복잡한 기능도 올바르게 추상화하면 단순한 인터페이스로 표현된다. 사용자가 마주하는 API는 최소한이어야 한다.
2. **직관이 최고의 UX.** 문서를 안 봐도 쓸 수 있는 API를 지향한다. 네이밍, 기본값, 타입 추론이 곧 문서다.
3. **로직과 뷰의 완전한 분리.** 상태/계산 로직(headless core)은 DOM을 모른다. 렌더링은 그 위에 얹는다. 이래야 Apple식으로 픽셀까지 통제 가능하다.
4. **원본은 불변.** 서버에서 받은 데이터는 절대 변형하지 않는다. 모든 변화는 파생(derive) 상태로 표현한다.
5. **타입이 계약이다.** `any`를 쓰지 않는다. 제네릭으로 행(row) 타입을 끝까지 추론시킨다.

---

## 2. 핵심 아키텍처: 3개의 독립 레이어

이 분리가 라이브러리의 전부다. 절대 섞지 않는다.

| 레이어 | 무엇 | 누가 바꾸나 | 영속성 |
|--------|------|------------|--------|
| `data` | 실제 값 (행의 배열) | 서버 | 서버 |
| `columnDefs` | 컬럼 구조·타입·렌더러 (설계도) | 개발자 또는 서버 | 코드/스키마 |
| `columnState` | 보이기·순서·이름·너비·핀 (사용자가 보는 방식) | **최종 사용자** | localStorage / 유저설정 |

최종 렌더링 컬럼은 이 합성으로 결정된다:

```ts
renderColumns = columnDefs
  .map(def => merge(def, columnState[def.key]))
  .filter(c => c.visible)
  .sort((a, b) => a.order - b.order)
```

데이터 흐름:

```
서버 응답(제각각) → [adapter] → 내부 표준 포맷(TableInput) → headless core(파생) → 렌더링
```

---

## 3. 핵심 개념 정의 (타입 시스템의 뼈대)

```ts
// ── 컬럼 설계도 (데이터 아님, 구조) ───────────────────────
type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom';

interface ColumnDef<T> {
  key: keyof T & string;        // 데이터 바인딩 키 (고유)
  label: string;                // 원본 헤더 텍스트 (export·바인딩 기준, 사용자가 못 바꿈)
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  pinnable?: boolean;
  hideable?: boolean;
  renderCell?: (ctx: CellContext<T>) => ReactNode;   // 커스텀 셀 렌더러
  renderHeader?: (ctx: HeaderContext<T>) => ReactNode;
}

// ── 사용자 뷰 상태 (엑셀처럼 조작되는 부분) ────────────────
interface ColumnState {
  key: string;
  visible: boolean;
  order: number;
  width?: number;
  pinned?: 'left' | 'right' | null;
  labelOverride?: string;       // 사용자가 바꾼 컬럼명. label과 분리 필수!
}

// ── 행 ──────────────────────────────────────────────────
interface Row<T> {
  rowId: string;                // 안정적 식별자 (PK). displayIndex와 절대 혼동 금지
  displayIndex: number;         // 현재 페이지/뷰 기준 순번 (1,2,3...) — 페이지 바뀌면 리셋
  globalIndex: number;          // 전체 데이터셋 기준 순번 — 페이지 무관 고유
  data: T;                      // 원본 객체 (불변)
  selected?: boolean;
}

// ── 셀 (행×컬럼 교차점, 독립 개념) ─────────────────────────
interface CellContext<T> {
  row: Row<T>;
  column: ColumnDef<T>;
  value: T[keyof T];
}

// ── 검색 (UX, 글로벌 텍스트 매칭) vs 필터 (데이터 쿼리) 분리 ─
interface SearchState {
  query: string;
  scope: 'all' | string[];      // 어느 컬럼에서 찾을지
}

type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'contains' | 'between' | 'in';

interface Filter {
  columnKey: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown;             // between용
}

// ── 라이브러리가 요구하는 최종 입력 (어댑터의 출력물) ───────
interface TableInput<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId?: (row: T) => string;   // 없으면 인덱스 기반 fallback
}
```

> **핵심 주의:** `label`(원본·불변) ≠ `labelOverride`(사용자 변경·표시용). 섞으면 컬럼명 바꾸는 순간 데이터 매핑이 깨진다. `rowId`(식별자) ≠ `displayIndex`(화면 순번). 셋을 같다고 가정하면 페이지네이션·선택에서 반드시 버그 난다.

---

## 4. 어댑터 패턴 (어떤 서버 형식이든 흡수)

라이브러리는 `TableInput<T>`만 받는다. 서버 형식 흡수는 사용자가 작성하는 어댑터의 책임이다. 흔한 ERP 응답 3종(순수 배열 / `{data, total, page}` 래퍼 / `{columns, rows}` 동적 스키마)을 위한 **헬퍼 어댑터를 기본 제공**한다.

```ts
// 라이브러리가 제공하는 헬퍼 예시
adaptArray(raw)                              // [ {...}, {...} ]
adaptPaginated(raw, { dataKey: 'data' })     // { data, total, page, pageSize }
adaptDynamicSchema(raw, { columnsKey, rowsKey, fieldKey, labelKey })  // 서버가 컬럼까지 내려주는 레거시 ERP
```

동적 스키마(서버가 컬럼 정의를 내려주는 경우)는 ERP에서 흔하므로 **컬럼 정의를 런타임 주입 가능**하게 설계한다. 컬럼을 코드에 하드코딩한다고 가정하지 않는다.

---

## 5. 기능 범위

**v1 (이 작업의 목표)**
- 클라이언트 모드 전용 (전체 데이터를 브라우저에서 처리). 단, 추후 서버 모드를 끼울 수 있도록 정렬/필터/페이지 변경을 이벤트로 추상화한다.
- 컬럼: 보이기·숨기기 / 순서 변경(DnD) / 리사이즈 / 핀(좌·우 고정) / 이름 변경(labelOverride)
- 정렬(단일·다중), 필터(컬럼별), 검색(글로벌)
- 행 선택(단일·다중·전체)
- 페이지네이션
- 행 가상화(virtualization) — 수천 행 대응
- columnState localStorage 영속화
- CSS 변수 기반 테마

**나중에 (지금 만들지 말 것)**
- 서버사이드 row model, 트리/그룹 행, 셀 인라인 편집, 피벗/집계, 엑셀 export, 셀 머지(span). 단, 위 타입 설계가 이들을 나중에 수용할 수 있어야 한다.

---

## 6. 기술 스택 결정

- **언어:** TypeScript (strict, `noUncheckedIndexedAccess`)
- **프레임워크:** React 18+ (peerDependency)
- **빌드:** tsup → ESM + CJS + d.ts 동시 출력. `sideEffects` 정확히 명시.
- **패키지 매니저:** pnpm. 장기적으로 ERP UI 라이브러리로 확장되므로 처음부터 **pnpm workspace 모노레포** 구조로 잡는다.
- **스타일:** Tailwind를 하드 의존성으로 넣지 않는다. **CSS 커스텀 프로퍼티(디자인 토큰) + 단일 import 가능한 CSS**로 테마. AG Grid의 theming 방식과 동일한 이유 — 사용처의 스타일 환경에 종속되지 않기 위해. (참고: 기존 디자인 시스템의 Phosphor Icons / Apple-adjacent 토큰 컨벤션과 정렬할 것.)
- **DnD(컬럼 순서):** `@dnd-kit/core`
- **가상화:** 직접 구현하되 `@tanstack/virtual`을 레퍼런스로 참고. (의존성으로 넣을지는 Phase 5에서 판단)
- **테스트:** Vitest + Testing Library
- **린트/포맷:** Biome (속도) 또는 ESLint+Prettier — 택1

---

## 7. 폴더 구조 (모노레포)

```
/
├── packages/
│   ├── table-core/          # headless. DOM 모름. 순수 로직·타입·파생 함수
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── adapters/
│   │   │   ├── derive/       # columnState 합성, 정렬·필터·검색 파생
│   │   │   └── index.ts
│   │   └── package.json
│   ├── table-react/         # React 바인딩. useTable 훅 + 기본 컴포넌트
│   │   ├── src/
│   │   │   ├── hooks/useTable.ts
│   │   │   ├── components/   # Table, Header, Body, Row, Cell, Toolbar
│   │   │   └── index.ts
│   │   └── package.json
│   └── table-styles/        # 디자인 토큰 + 기본 테마 CSS
├── apps/
│   └── playground/          # Vite 개발 샌드박스 (더미 ERP 데이터로 검증)
├── pnpm-workspace.yaml
└── SPEC.md                  # 이 문서
```

> **분리 원칙:** `table-core`는 React를 import하지 않는다(순수 TS). 이래야 나중에 Vue/vanilla 바인딩을 얹을 수 있다. 지금 다른 프레임워크 바인딩을 만들진 않지만, 경계는 처음부터 지킨다.

---

## 8. API 설계 목표 (직관성 검증 기준)

기본 사용이 이 정도로 단순해야 한다:

```tsx
const table = useTable({
  data: employees,
  columns: [
    { key: 'name', label: '사원명' },
    { key: 'dept', label: '부서', filterable: true },
    { key: 'salary', label: '급여', type: 'number', align: 'right' },
  ],
  getRowId: (r) => r.id,
});

return <Table table={table} />;   // 이 한 줄로 정렬·검색·컬럼조작 다 동작
```

고급 사용자는 같은 `table` 객체에서 headless 프리미티브를 꺼내 직접 그릴 수 있어야 한다(`table.getRenderColumns()`, `table.getRows()` 등).

---

## 9. 단계별 빌드 플랜 (이 순서로, Phase마다 멈춤)

- **Phase 0 — 스캐폴드:** pnpm workspace, 세 패키지 + playground, tsup/tsconfig/lint 셋업, 빈 빌드 통과 확인.
- **Phase 1 — headless core (UI 없음):** 타입 전체 정의, 어댑터 3종, columnState 합성(`renderColumns` 파생), rowId/displayIndex/globalIndex 부여 로직. 단위 테스트로 검증.
- **Phase 2 — 기본 렌더링:** Table/Header/Body/Row/Cell + 기본 토큰 CSS. 정적 데이터가 화면에 그려지는 것까지.
- **Phase 3 — 컬럼 조작:** 보이기·숨기기 패널, DnD 순서 변경, 리사이즈, 핀(좌/우), 이름 변경(labelOverride). columnState만 변하고 data·columnDefs는 불변임을 테스트로 보장.
- **Phase 4 — 정렬·필터·검색:** 단일/다중 정렬, 컬럼 필터(operator별), 글로벌 검색. 검색과 필터를 별개 상태로 유지.
- **Phase 5 — 가상화:** 행 windowing. 1만 행 playground에서 스크롤 성능 확인.
- **Phase 6 — 선택·페이지네이션:** 행 선택(단일/다중/전체), 페이지네이션. globalIndex 기반 선택 유지 검증.
- **Phase 7 — 영속화·테마:** columnState ↔ localStorage, "초기화" 동작, CSS 변수 다크모드.

---

## 10. 하지 말아야 할 것 (가드레일)

- `data` 원본을 mutate하지 마라. 정렬·필터는 항상 새 배열을 파생.
- `rowId`와 `displayIndex`를 같은 값으로 쓰지 마라.
- `label`을 사용자 입력으로 덮어쓰지 마라. 항상 `labelOverride` 별도 필드.
- `table-core`에서 React·DOM·`window`를 참조하지 마라.
- 한 컴포넌트가 정렬·필터·렌더·영속화를 다 하게 만들지 마라. 책임 분리.
- `any` 금지. 타입 추론이 안 되면 제네릭 설계를 다시 본다.
- v1 범위 밖 기능(편집·피벗·트리)을 미리 구현하지 마라. 단, 타입이 그걸 막지는 않게.

---

## 11. 시작 지시 (Claude Code에게)

> 위 SPEC을 읽고 **Phase 0만** 진행해라. 모노레포 스캐폴드와 빈 빌드 통과까지만 만들고 멈춰서, 구조와 주요 설정 결정(빌드 도구, 린터, 스타일 전략)을 내게 확인받아라. 내가 승인하면 Phase 1로 넘어간다.
