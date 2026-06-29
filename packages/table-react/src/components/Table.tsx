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
import { TableContext, type TableSettings } from './context';

const DEFAULT_ROW_HEIGHT = 40;

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
  /** row height in px, must match the CSS row height. Default 40. */
  rowHeight?: number;
  /** opt out of virtualization even when `maxHeight` is set. Default false. */
  disableVirtualization?: boolean;
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
  rowHeight = DEFAULT_ROW_HEIGHT,
  disableVirtualization = false,
  className,
}: TableProps<T>): ReactNode {
  const resolvedMessages = useMemo(() => resolveMessages(locale, messages), [locale, messages]);
  const columns = table.getRenderColumns();
  const rows = table.getRows();

  const [resizeMode, setResizeMode] = useState(false);
  const toggleResizeMode = useCallback(() => setResizeMode((v) => !v), []);

  // display settings — seeded by props, then editable via the footer settings menu
  const [settings, setSettings] = useState<TableSettings>(() => ({
    rowBorders,
    columnBorders,
    striped,
    scrollX,
    stickyHeader: maxHeight != null,
  }));
  const setSetting = useCallback(
    (key: keyof TableSettings, value: boolean) => setSettings((s) => ({ ...s, [key]: value })),
    [],
  );

  const effectiveMaxHeight = settings.stickyHeader ? (maxHeight ?? 480) : undefined;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtual = useVirtualRows(scrollRef, {
    count: rows.length,
    rowHeight,
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
      settings,
      setSetting,
    }),
    [table, resolvedMessages, selectable, resizeMode, toggleResizeMode, settings, setSetting],
  );

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
