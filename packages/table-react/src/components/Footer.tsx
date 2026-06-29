import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Settings } from './Settings';
import { useTableContext } from './context';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
/** how many numbered pages to show at once */
const WINDOW = 10;

/**
 * Footer — the table's footer region, rendered as a separate block below the card.
 * Layout: total count (left) · pagination (center) · page-size selector (right).
 *
 * Pagination structure:
 *   ≤ WINDOW pages:  ‹ Back  1 … N  Next ›
 *   >  WINDOW pages: « First  ‹ Back  [window of N around current, with …]  Next ›  Last »
 */
export function Footer<T>(): ReactNode {
  const { table, messages } = useTableContext<T>();
  const page = table.getPage();
  const pageCount = table.getPageCount();
  const pageSize = table.getPageSize();
  const total = table.getTotalCount();
  const selectedCount = table.getSelectedCount();
  const paged = pageSize > 0;

  const compact = pageCount > WINDOW; // show First/Last + ellipses
  const { pages, leadingEllipsis, trailingEllipsis } = buildPages(page, pageCount);

  return (
    <div className="sft-tfoot">
      <div className="sft-tfoot__left">
        <span className="sft-tfoot__total">{messages.totalCount(total)}</span>
        {selectedCount > 0 && (
          <span className="sft-tfoot__selected">{messages.selectedCount(selectedCount)}</span>
        )}
      </div>

      <div className="sft-tfoot__center">
        {paged && pageCount > 1 && (
          <nav className="sft-pager" aria-label="pagination">
            {compact && (
              <button
                type="button"
                className="sft-pager__btn sft-pager__btn--nav"
                disabled={page <= 1}
                onClick={() => table.setPage(1)}
              >
                <ChevronsLeft size={16} />
                <span className="sft-pager__navlabel">{messages.first}</span>
              </button>
            )}
            <button
              type="button"
              className="sft-pager__btn sft-pager__btn--nav"
              disabled={page <= 1}
              onClick={() => table.setPage(page - 1)}
            >
              <ChevronLeft size={16} />
              <span className="sft-pager__navlabel">{messages.back}</span>
            </button>

            {leadingEllipsis && <span className="sft-pager__ellipsis">…</span>}
            {pages.map((p) => (
              <button
                type="button"
                key={p}
                className="sft-pager__btn sft-pager__btn--page"
                data-active={p === page || undefined}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => table.setPage(p)}
              >
                {p}
              </button>
            ))}
            {trailingEllipsis && <span className="sft-pager__ellipsis">…</span>}

            <button
              type="button"
              className="sft-pager__btn sft-pager__btn--nav"
              disabled={page >= pageCount}
              onClick={() => table.setPage(page + 1)}
            >
              <span className="sft-pager__navlabel">{messages.next}</span>
              <ChevronRight size={16} />
            </button>
            {compact && (
              <button
                type="button"
                className="sft-pager__btn sft-pager__btn--nav"
                disabled={page >= pageCount}
                onClick={() => table.setPage(pageCount)}
              >
                <span className="sft-pager__navlabel">{messages.last}</span>
                <ChevronsRight size={16} />
              </button>
            )}
          </nav>
        )}
      </div>

      <div className="sft-tfoot__right">
        <Settings />
        {paged && (
          <select
            className="sft-tfoot__pagesize"
            value={pageSize}
            aria-label={messages.rowsPerPage}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {messages.perPage(n)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

interface PageWindow {
  pages: number[];
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
}

/** A window of up to WINDOW consecutive pages containing `current`, with edge ellipses. */
function buildPages(current: number, count: number): PageWindow {
  if (count <= WINDOW) {
    return {
      pages: Array.from({ length: count }, (_, i) => i + 1),
      leadingEllipsis: false,
      trailingEllipsis: false,
    };
  }
  let start = Math.max(1, current - Math.floor(WINDOW / 2));
  let end = start + WINDOW - 1;
  if (end > count) {
    end = count;
    start = end - WINDOW + 1;
  }
  return {
    pages: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    leadingEllipsis: start > 1,
    trailingEllipsis: end < count,
  };
}
