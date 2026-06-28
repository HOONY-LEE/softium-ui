/**
 * i18n message catalog.
 *
 * Only the library's *own* UI strings live here (toolbar labels, empty state, etc.).
 * Column headers are NOT translated through this — those come from `ColumnDef.label`
 * and the user-facing `ColumnState.labelOverride`, kept deliberately separate (SPEC §3).
 *
 * A host app overrides any subset of strings; missing keys fall back to the default locale.
 */

export interface TableMessages {
  /** shown when there are no rows to display */
  emptyText: string;
  /** global search input placeholder */
  searchPlaceholder: string;
  /** column-visibility / settings panel trigger */
  columns: string;
  /** reset columnState to defaults */
  reset: string;
  /** toggle column-width resize mode */
  resizeColumns: string;
  /** tooltip on the resize handle hinting double-click auto-fit */
  autoFitHint: string;
  /** pin submenu */
  pinLeft: string;
  pinRight: string;
  unpin: string;
  /** hide a single column */
  hideColumn: string;
  /** rename a column (labelOverride) */
  renameColumn: string;
  /** selection summary, e.g. "{count} selected" */
  selectedCount: (count: number) => string;
  /** total row count summary, e.g. "{count} rows" */
  totalCount: (count: number) => string;
  /** page-size option label, e.g. "10 per page" */
  perPage: (count: number) => string;
  /** pagination */
  rowsPerPage: string;
  /** page X of Y */
  pageOf: (page: number, total: number) => string;
  /** pagination nav labels */
  first: string;
  back: string;
  next: string;
  last: string;
}

export const ko: TableMessages = {
  emptyText: '표시할 데이터가 없습니다',
  searchPlaceholder: '검색',
  columns: '컬럼',
  reset: '초기화',
  resizeColumns: '너비 조절',
  autoFitHint: '더블클릭: 너비 자동 맞춤',
  pinLeft: '왼쪽 고정',
  pinRight: '오른쪽 고정',
  unpin: '고정 해제',
  hideColumn: '컬럼 숨기기',
  renameColumn: '이름 변경',
  selectedCount: (count) => `${count}개 선택됨`,
  totalCount: (count) => `전체 ${count.toLocaleString()}행`,
  perPage: (count) => `${count}개씩 보기`,
  rowsPerPage: '페이지당 행',
  pageOf: (page, total) => `${total} 페이지 중 ${page}`,
  first: '처음',
  back: '이전',
  next: '다음',
  last: '마지막',
};

export const en: TableMessages = {
  emptyText: 'No data to display',
  searchPlaceholder: 'Search',
  columns: 'Columns',
  reset: 'Reset',
  resizeColumns: 'Resize',
  autoFitHint: 'Double-click: auto-fit',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  hideColumn: 'Hide column',
  renameColumn: 'Rename',
  selectedCount: (count) => `${count} selected`,
  totalCount: (count) => `${count.toLocaleString()} rows`,
  perPage: (count) => `${count} / page`,
  rowsPerPage: 'Rows per page',
  pageOf: (page, total) => `Page ${page} of ${total}`,
  first: 'First',
  back: 'Back',
  next: 'Next',
  last: 'Last',
};

export const locales = { ko, en } as const;

export type LocaleKey = keyof typeof locales;

export const defaultMessages = ko;
