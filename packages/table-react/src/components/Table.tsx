import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { TableInstance } from '../hooks/useTable';
import { useVirtualRows } from '../hooks/useVirtualRows';
import { resolveMessages } from '../i18n';
import type { LocaleKey, TableMessages } from '../i18n';
import { Body } from './Body';
import { FilterRow } from './FilterRow';
import { Footer } from './Footer';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { TableContext, type TableDensity, type TableSettings } from './context';

/** row height (px) per density preset */
const DENSITY_ROW_HEIGHT: Record<TableDensity, number> = {
  compact: 34,
  normal: 40,
  comfortable: 52,
};

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
  /** allow horizontal scrolling. Default false — columns shrink to fit (no x-scroll). */
  scrollX?: boolean;
  /** horizontal separators between rows. Default false. */
  rowBorders?: boolean;
  /** vertical separators between columns. Default false. */
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
  /** called when an edited cell is committed */
  onCellChange?: (rowId: string, columnKey: string, value: unknown) => void;
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
  scrollX = false,
  rowBorders = false,
  columnBorders = false,
  striped = true,
  maxHeight,
  density = 'normal',
  rowHeight,
  disableVirtualization = false,
  editable = false,
  onCellChange,
  className,
}: TableProps<T>): ReactNode {
  const resolvedMessages = useMemo(() => resolveMessages(locale, messages), [locale, messages]);
  const columns = table.getRenderColumns();
  const rows = table.getRows();

  const [resizeMode, setResizeMode] = useState(false);
  const toggleResizeMode = useCallback(() => setResizeMode((v) => !v), []);

  // inline editing (DataGrid)
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const beginEdit = useCallback(
    (rowId: string, columnKey: string) => setEditingCell({ rowId, columnKey }),
    [],
  );
  const cancelEdit = useCallback(() => setEditingCell(null), []);
  const commitEdit = useCallback(
    (rowId: string, columnKey: string, value: unknown) => {
      onCellChange?.(rowId, columnKey, value);
      setEditingCell(null);
    },
    [onCellChange],
  );

  // display settings — seeded by props, then editable via the footer settings menu
  const [settings, setSettings] = useState<TableSettings>(() => ({
    rowBorders,
    columnBorders,
    striped,
    scrollX,
    stickyHeader: maxHeight != null,
    density,
  }));
  const setSetting = useCallback(
    (
      key: 'rowBorders' | 'columnBorders' | 'striped' | 'scrollX' | 'stickyHeader',
      value: boolean,
    ) => setSettings((s) => ({ ...s, [key]: value })),
    [],
  );
  const setDensity = useCallback(
    (d: TableDensity) => setSettings((s) => ({ ...s, density: d })),
    [],
  );

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
      scrollX: settings.scrollX,
      resizeMode,
      toggleResizeMode,
      editable,
      editingCell,
      beginEdit,
      cancelEdit,
      commitEdit,
      settings,
      setSetting,
      setDensity,
    }),
    [
      table,
      resolvedMessages,
      selectable,
      resizeMode,
      toggleResizeMode,
      editable,
      editingCell,
      beginEdit,
      cancelEdit,
      commitEdit,
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
