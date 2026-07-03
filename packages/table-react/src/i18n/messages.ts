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
  /** footer settings menu */
  settings: string;
  editColumns: string;
  editTable: string;
  /** table display setting labels */
  settingRowBorders: string;
  settingColumnBorders: string;
  settingStriped: string;
  settingScrollX: string;
  settingStickyHeader: string;
  settingIndexColumn: string;
  /** row density */
  density: string;
  densityCompact: string;
  densityNormal: string;
  densityComfortable: string;
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
  /** text-alignment controls */
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
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
  /** header label for the leading row-number (index) column */
  indexHeader: string;
  /** toolbar export menu trigger */
  exportLabel: string;
  /** DataGrid edit-mode controls */
  editButton: string;
  doneEdit: string;
  discardChanges: string;
  /** save button with pending-change count, e.g. "Save (3)" */
  saveChanges: (count: number) => string;
}

export const ko: TableMessages = {
  emptyText: '표시할 데이터가 없습니다',
  searchPlaceholder: '검색',
  columns: '컬럼',
  settings: '설정',
  editColumns: '컬럼 편집',
  editTable: '테이블 편집',
  settingRowBorders: '행 경계선',
  settingColumnBorders: '열 경계선',
  settingStriped: '줄무늬',
  settingScrollX: '좌우 스크롤',
  settingStickyHeader: '헤더 고정',
  settingIndexColumn: '인덱스 컬럼',
  density: '행 높이',
  densityCompact: '좁게',
  densityNormal: '보통',
  densityComfortable: '넓게',
  reset: '초기화',
  resizeColumns: '너비 조절',
  autoFitHint: '더블클릭: 너비 자동 맞춤',
  pinLeft: '왼쪽 고정',
  pinRight: '오른쪽 고정',
  unpin: '고정 해제',
  alignLeft: '왼쪽 정렬',
  alignCenter: '가운데 정렬',
  alignRight: '오른쪽 정렬',
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
  indexHeader: 'No.',
  exportLabel: '내보내기',
  editButton: '편집',
  doneEdit: '완료',
  discardChanges: '취소',
  saveChanges: (count) => (count > 0 ? `저장 (${count})` : '저장'),
};

export const en: TableMessages = {
  emptyText: 'No data to display',
  searchPlaceholder: 'Search',
  columns: 'Columns',
  settings: 'Settings',
  editColumns: 'Edit columns',
  editTable: 'Edit table',
  settingRowBorders: 'Row borders',
  settingColumnBorders: 'Column borders',
  settingStriped: 'Striped',
  settingScrollX: 'Horizontal scroll',
  settingStickyHeader: 'Sticky header',
  settingIndexColumn: 'Index column',
  density: 'Row height',
  densityCompact: 'Compact',
  densityNormal: 'Normal',
  densityComfortable: 'Comfortable',
  reset: 'Reset',
  resizeColumns: 'Resize',
  autoFitHint: 'Double-click: auto-fit',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
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
  indexHeader: 'No.',
  exportLabel: 'Export',
  editButton: 'Edit',
  doneEdit: 'Done',
  discardChanges: 'Cancel',
  saveChanges: (count) => (count > 0 ? `Save (${count})` : 'Save'),
};

export const locales = { ko, en } as const;

export type LocaleKey = keyof typeof locales;

export const defaultMessages = ko;
