import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableInstance } from '../hooks/useTable';
import { useVirtualRows } from '../hooks/useVirtualRows';
import { resolveMessages } from '../i18n';
import type { LocaleKey, TableMessages } from '../i18n';
import { Body } from './Body';
import { FilterRow } from './FilterRow';
import { Footer } from './Footer';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import {
  type CellChange,
  type CommitMode,
  type EditMode,
  TableContext,
  type TableDensity,
  type TableSettings,
} from './context';

/** row height (px) per density preset. `normal` is the mid-point of the range and
 *  is the default, so rows land on a comfortable middle height out of the box. */
const DENSITY_ROW_HEIGHT: Record<TableDensity, number> = {
  compact: 34,
  normal: 44,
  comfortable: 54,
};

/** stable key for a cell in the dirty buffer */
const dirtyKey = (rowId: string, columnKey: string) => `${rowId} ${columnKey}`;

export interface TableProps<T> {
  table: TableInstance<T>;
  /** UI language for the library's own strings (not column headers). Default 'ko'. */
  locale?: LocaleKey;
  /** override individual UI strings */
  messages?: Partial<TableMessages>;
  /** override the empty-state content */
  emptyText?: ReactNode;
  /** show the column-control toolbar (search + column controls). Default true. */
  toolbar?: boolean;
  /** custom toolbar actions on the right (e.g. a "+ Add" button) */
  toolbarActions?: ReactNode;
  /** show the inline per-column filter row (opt-in). Default false. */
  filterRow?: boolean;
  /** render a leading selection checkbox column. Default false. */
  selectable?: boolean;
  /** render a leading row-number (index) column. Default false. */
  indexColumn?: boolean;
  /** allow horizontal scrolling. Default false — columns shrink to fit (no x-scroll). */
  scrollX?: boolean;
  /** horizontal separators between rows. Default false — except an editable grid
   *  (DataGrid) defaults to showing borders while edit mode is active. */
  rowBorders?: boolean;
  /** vertical separators between columns. Same default rule as `rowBorders`. */
  columnBorders?: boolean;
  /** very-light alternating row background (zebra). Default true. */
  striped?: boolean;
  /** max body height (px). When set, the header stays fixed and the body scrolls
   *  vertically; also enables row virtualization. */
  maxHeight?: number;
  /** initial row density. Default 'normal'. */
  density?: TableDensity;
  /** explicit row height (px) — overrides density when set. */
  rowHeight?: number;
  /** opt out of virtualization even when `maxHeight` is set. Default false. */
  disableVirtualization?: boolean;
  /** enable inline cell editing (editable columns become editable). Default false. */
  editable?: boolean;
  /** when cells are editable: 'always' (default) or 'toggle' (gated behind an Edit button). */
  editMode?: EditMode;
  /** how edits are committed: 'cell' (immediate, default) or 'batch' (staged until Save). */
  commitMode?: CommitMode;
  /** called when an edited cell is committed (cell mode), or per change on Save (batch mode). */
  onCellChange?: (rowId: string, columnKey: string, value: unknown) => void;
  /** called once with all staged changes when Save is pressed (batch mode). */
  onSave?: (changes: CellChange[]) => void;
  /** extra class on the root element */
  className?: string;
}

/**
 * The batteries-included table. One line renders a fully styled table:
 *
 *   <Table table={table} />
 *
 * Header/Body/Row/Cell are also exported for advanced composition; they read the
 * same instance via context.
 */
export function Table<T>({
  table,
  locale,
  messages,
  emptyText,
  toolbar = true,
  toolbarActions,
  filterRow = false,
  selectable = false,
  indexColumn = false,
  scrollX = false,
  rowBorders: rowBordersProp,
  columnBorders: columnBordersProp,
  striped = true,
  maxHeight,
  density = 'normal',
  rowHeight,
  disableVirtualization = false,
  editable = false,
  editMode = 'always',
  commitMode = 'cell',
  onCellChange,
  onSave,
  className,
}: TableProps<T>): ReactNode {
  const resolvedMessages = useMemo(() => resolveMessages(locale, messages), [locale, messages]);
  const columns = table.getRenderColumns();
  const rows = table.getRows();

  // row number of the first row on the current page (1-based numbering added in Row)
  const pageSizeNow = table.getPageSize();
  const indexOffset = pageSizeNow > 0 ? (table.getPage() - 1) * pageSizeNow : 0;

  const [resizeMode, setResizeMode] = useState(false);
  const toggleResizeMode = useCallback(() => setResizeMode((v) => !v), []);

  // inline editing (DataGrid): one click selects (activeCell), a second click /
  // Enter / double-click edits (editingCell).
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const beginEdit = useCallback((rowId: string, columnKey: string) => {
    setActiveCell({ rowId, columnKey });
    setEditingCell({ rowId, columnKey });
  }, []);
  const cancelEdit = useCallback(() => setEditingCell(null), []);

  // edit-mode gate: 'always' is always on; 'toggle' starts off until the Edit button.
  const [editEnabled, setEditEnabled] = useState(editMode === 'always');
  const enableEdit = useCallback(() => setEditEnabled(true), []);
  const exitEdit = useCallback(() => {
    setEditEnabled(false);
    setActiveCell(null);
    setEditingCell(null);
  }, []);

  // batch commit: staged edits live here until Save. Keyed by rowId + columnKey.
  const [dirty, setDirty] = useState<Map<string, CellChange>>(() => new Map());

  // original (server) cell values, so a batch edit back to the original drops the stage
  const originalRef = useRef(new Map<string, unknown>());
  originalRef.current = useMemo(() => {
    const m = new Map<string, unknown>();
    for (const r of rows) {
      for (const c of columns) m.set(dirtyKey(r.rowId, c.key), r.data[c.key as keyof T]);
    }
    return m;
  }, [rows, columns]);

  const commitEdit = useCallback(
    (rowId: string, columnKey: string, value: unknown) => {
      if (commitMode === 'batch') {
        setDirty((prev) => {
          const next = new Map(prev);
          const k = dirtyKey(rowId, columnKey);
          if (Object.is(originalRef.current.get(k), value)) next.delete(k);
          else next.set(k, { rowId, columnKey, value });
          return next;
        });
      } else {
        onCellChange?.(rowId, columnKey, value);
      }
      setEditingCell(null);
    },
    [commitMode, onCellChange],
  );

  const getStaged = useCallback(
    (rowId: string, columnKey: string) => {
      const e = dirty.get(dirtyKey(rowId, columnKey));
      return e ? { dirty: true, value: e.value } : { dirty: false, value: undefined };
    },
    [dirty],
  );
  const saveAll = useCallback(() => {
    const changes = [...dirty.values()];
    if (changes.length > 0) {
      if (onSave) onSave(changes);
      else for (const c of changes) onCellChange?.(c.rowId, c.columnKey, c.value);
    }
    setDirty(new Map());
  }, [dirty, onSave, onCellChange]);
  const discardAll = useCallback(() => setDirty(new Map()), []);

  // display settings — seeded by props, then editable via the footer settings menu.
  // Border defaults: an explicit prop always wins; otherwise an editable grid shows
  // borders while edit mode is active and hides them while read-only (see the effect
  // below, which keeps this in sync as edit mode toggles at runtime).
  const [settings, setSettings] = useState<TableSettings>(() => ({
    rowBorders: rowBordersProp ?? (editable ? editEnabled : false),
    columnBorders: columnBordersProp ?? (editable ? editEnabled : false),
    striped,
    scrollX,
    stickyHeader: maxHeight != null,
    indexColumn,
    density,
  }));
  const setSetting = useCallback(
    (
      key: 'rowBorders' | 'columnBorders' | 'striped' | 'scrollX' | 'stickyHeader' | 'indexColumn',
      value: boolean,
    ) => setSettings((s) => ({ ...s, [key]: value })),
    [],
  );
  const setDensity = useCallback(
    (d: TableDensity) => setSettings((s) => ({ ...s, density: d })),
    [],
  );

  // keep row/column borders following edit-mode transitions, unless the caller
  // pinned an explicit value via props
  useEffect(() => {
    if (!editable || rowBordersProp !== undefined) return;
    setSettings((s) => ({ ...s, rowBorders: editEnabled }));
  }, [editable, editEnabled, rowBordersProp]);
  useEffect(() => {
    if (!editable || columnBordersProp !== undefined) return;
    setSettings((s) => ({ ...s, columnBorders: editEnabled }));
  }, [editable, editEnabled, columnBordersProp]);

  // row height: explicit prop overrides the density preset
  const rowH = rowHeight ?? DENSITY_ROW_HEIGHT[settings.density];
  const effectiveMaxHeight = settings.stickyHeader ? (maxHeight ?? 480) : undefined;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtual = useVirtualRows(scrollRef, {
    count: rows.length,
    rowHeight: rowH,
    enabled: effectiveMaxHeight != null && !disableVirtualization,
  });

  const contextValue = useMemo(
    () => ({
      table,
      messages: resolvedMessages,
      selectable,
      indexOffset,
      scrollX: settings.scrollX,
      resizeMode,
      toggleResizeMode,
      editable,
      editMode,
      commitMode,
      editEnabled,
      enableEdit,
      exitEdit,
      activeCell,
      setActiveCell,
      editingCell,
      beginEdit,
      cancelEdit,
      commitEdit,
      dirtyCount: dirty.size,
      getStaged,
      saveAll,
      discardAll,
      settings,
      setSetting,
      setDensity,
    }),
    [
      table,
      resolvedMessages,
      selectable,
      indexOffset,
      resizeMode,
      toggleResizeMode,
      editable,
      editMode,
      commitMode,
      editEnabled,
      enableEdit,
      exitEdit,
      activeCell,
      editingCell,
      beginEdit,
      cancelEdit,
      commitEdit,
      dirty,
      getStaged,
      saveAll,
      discardAll,
      settings,
      setSetting,
      setDensity,
    ],
  );

  // density drives the row-height CSS var; cells read it (and virtualization matches)
  const cardStyle = { '--sft-table-row-height': `${rowH}px` } as React.CSSProperties;
  const scrollStyle = effectiveMaxHeight != null ? { maxHeight: effectiveMaxHeight } : undefined;

  // four separated regions: Toolbar / [Header + Body card] / Footer
  return (
    <TableContext.Provider value={contextValue}>
      <div className={className ? `sft-table-root ${className}` : 'sft-table-root'}>
        {/* ── 툴바 (toolbar): search (left) · actions (right) ── */}
        {toolbar && <Toolbar actions={toolbarActions} />}

        {/* ── 카드: 헤더 + 바디 (the bordered scrolling grid) ── */}
        <div
          className="sft-table"
          style={cardStyle}
          data-scroll-x={settings.scrollX || undefined}
          data-row-borders={settings.rowBorders || undefined}
          data-col-borders={settings.columnBorders || undefined}
          data-striped={settings.striped || undefined}
          data-resizing={resizeMode || undefined}
          data-editable={editable || undefined}
        >
          <div className="sft-table__scroll" role="table" ref={scrollRef} style={scrollStyle}>
            <Header columns={columns} />
            {filterRow && <FilterRow columns={columns} />}
            <Body
              rows={rows}
              columns={columns}
              emptyText={emptyText ?? resolvedMessages.emptyText}
              virtual={virtual}
            />
          </div>
        </div>

        {/* ── 푸터 (footer): totals · pagination · page-size + settings menu ── */}
        <Footer />
      </div>
    </TableContext.Provider>
  );
}
