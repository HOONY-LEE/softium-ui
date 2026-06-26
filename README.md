# softium-ui

> ERP 화면 전용 React UI 라이브러리. **Table**이 첫 번째 컴포넌트입니다.

**"어떤 서버 데이터가 들어와도 그릴 수 있고, 엑셀처럼 컬럼을 조작할 수 있으며, 기본 상태로도 아름다운 ERP용 React 테이블 라이브러리."**

TanStack Table의 우아한 로직/뷰 분리를 따르되, headless가 주는 보일러플레이트 부담을 없애기 위해 **즉시 쓸 수 있는 스타일드 레이어를 함께 제공**합니다.

자세한 설계는 [`SPEC.md`](./SPEC.md)를 참고하세요.

---

## 모노레포 구조

| 패키지 | 역할 | React 의존 |
|--------|------|:----------:|
| [`@softium/table-core`](./packages/table-core) | headless 코어. 타입·어댑터·파생(derive) 로직. DOM을 모름. | ❌ |
| [`@softium/table-react`](./packages/table-react) | React 바인딩. `useTable` 훅 + 기본 컴포넌트 + i18n. | ✅ (peer) |
| [`@softium/table-styles`](./packages/table-styles) | CSS 변수(디자인 토큰) + 기본 테마. 다크모드·반응형. | ❌ |
| [`apps/playground`](./apps/playground) | Vite 데모/개발 샌드박스. 더미 ERP 데이터로 검증. | — |

3-레이어 아키텍처(`data` / `columnDefs` / `columnState`)와 어댑터 패턴이 핵심입니다.

## 핵심 고려사항

- **완벽한 반응형** — 토큰 기반 레이아웃, 좁은 화면 대응
- **다국어(i18n)** — UI 문자열은 locale 주입식. 컬럼 `label`(불변)과 사용자 표시명(`labelOverride`)을 분리
- **테마** — Tailwind 하드 의존 없음. CSS 커스텀 프로퍼티 + 단일 import. 다크모드 포함
- **데모 사이트** — playground에서 실제 렌더 결과 확인

## 기술 스택

- TypeScript (strict, `noUncheckedIndexedAccess`)
- React 18+ (peerDependency)
- 빌드: **tsup** (ESM + CJS + d.ts)
- 패키지 매니저: **pnpm workspace** 모노레포
- 스타일: **CSS 커스텀 프로퍼티** (디자인 토큰)
- 린트/포맷: **Biome**
- 테스트: **Vitest** + Testing Library

## 개발

```bash
pnpm install      # 의존성 설치
pnpm build        # 모든 패키지 빌드 (ESM/CJS/d.ts)
pnpm dev          # playground 데모 사이트 실행
pnpm typecheck    # 전체 타입 체크
pnpm test         # 단위 테스트
pnpm lint         # Biome 린트
pnpm lint:fix     # 자동 수정
```

## 빌드 로드맵 (Phase)

- [x] **Phase 0** — 모노레포 스캐폴드, 빈 빌드 통과
- [x] **Phase 1** — headless core: 타입, 어댑터 3종, columnState 합성, row 인덱싱
- [x] **Phase 2** — 기본 렌더링: Table/Header/Body/Row/Cell + 토큰 CSS + i18n
- [x] **Phase 3** — 컬럼 조작: 숨김/DnD 순서/리사이즈/핀/이름변경
- [x] **Phase 4** — 정렬(다중)·필터(operator별)·검색(글로벌)
- [x] **Phase 5** — 행 가상화 (1만 행)
- [x] **Phase 6** — 선택(단일/다중/전체)·페이지네이션
- [x] **Phase 7** — 영속화(localStorage)·테마(다크모드)

v1 범위 완료. 다음 후보(SPEC §5 "나중에"): 서버사이드 row model, 트리/그룹 행,
셀 인라인 편집, 피벗/집계, 엑셀 export, 셀 머지.

## 사용 예시

```tsx
import { useTable, Table } from '@softium/table-react';
import '@softium/table-styles';

const table = useTable({
  data: employees,
  columns: [
    { key: 'name', label: '사원명' },
    { key: 'dept', label: '부서', filterable: true },
    { key: 'salary', label: '급여', type: 'number', align: 'right' },
  ],
  getRowId: (r) => r.id,
  pageSize: 20,
  persistKey: 'employees-table', // 컬럼 레이아웃 localStorage 영속화
});

return <Table table={table} locale="ko" selectable height={480} />;
```

## License

MIT
