import type { ReactNode } from 'react';
import { useTableContext } from './context';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Footer — the table's footer region, rendered as a separate block below the card.
 * Layout: page-size selector (left) · numbered pagination (center) · totals (right).
 */
export function Footer<T>(): ReactNode {
  const { table, messages } = useTableContext<T>();
  const page = table.getPage();
  const pageCount = table.getPageCount();
  const pageSize = table.getPageSize();
  const total = table.getTotalCount();
  const selectedCount = table.getSelectedCount();
  const paged = pageSize > 0;

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
            <button
              type="button"
              className="sft-pager__nav"
              disabled={page <= 1}
              onClick={() => table.setPage(page - 1)}
            >
              ‹
            </button>
            {pageList(page, pageCount).map((p, i) =>
              p === 'ellipsis' ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis positions are stable within a render
                <span key={`e${i}`} className="sft-pager__ellipsis">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  className="sft-pager__page"
                  data-active={p === page || undefined}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => table.setPage(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              className="sft-pager__nav"
              disabled={page >= pageCount}
              onClick={() => table.setPage(page + 1)}
            >
              ›
            </button>
          </nav>
        )}
      </div>

      <div className="sft-tfoot__right">
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

/** Windowed page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20 */
function pageList(current: number, count: number): Array<number | 'ellipsis'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < count - 1) pages.push('ellipsis');

  pages.push(count);
  return pages;
}
