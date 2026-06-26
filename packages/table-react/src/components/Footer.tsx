import type { ReactNode } from 'react';
import { useTableContext } from './context';

/**
 * Footer — the table's footer region (one of the four: Toolbar / Header / Body / Footer).
 * Left: total row count + selection count. Right: pagination controls (when paged).
 * Selection is keyed by rowId, so its count persists across pages.
 */
export function Footer<T>(): ReactNode {
  const { table, messages } = useTableContext<T>();
  const page = table.getPage();
  const pageCount = table.getPageCount();
  const pageSize = table.getPageSize();
  const total = table.getTotalCount();
  const selectedCount = table.getSelectedCount();

  return (
    <div className="sft-tfoot">
      <div className="sft-tfoot__info">
        <span className="sft-tfoot__total">{messages.totalCount(total)}</span>
        {selectedCount > 0 && (
          <span className="sft-tfoot__selected">{messages.selectedCount(selectedCount)}</span>
        )}
      </div>
      {pageSize > 0 && (
        <div className="sft-tfoot__pager">
          <button
            type="button"
            className="sft-btn"
            disabled={page <= 1}
            onClick={() => table.setPage(page - 1)}
          >
            ‹
          </button>
          <span className="sft-tfoot__page">{messages.pageOf(page, pageCount)}</span>
          <button
            type="button"
            className="sft-btn"
            disabled={page >= pageCount}
            onClick={() => table.setPage(page + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
