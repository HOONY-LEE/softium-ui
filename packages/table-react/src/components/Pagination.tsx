import type { ReactNode } from 'react';
import { useTableContext } from './context';

/**
 * Pagination footer. Rendered by Table when pageSize > 0. Also surfaces the
 * selection count (selection is keyed by rowId, so it persists across pages).
 */
export function Pagination<T>(): ReactNode {
  const { table, messages } = useTableContext<T>();
  const page = table.getPage();
  const pageCount = table.getPageCount();
  const selectedCount = table.getSelectedCount();

  return (
    <div className="sft-pagination">
      <div className="sft-pagination__info">
        {selectedCount > 0 && (
          <span className="sft-pagination__selected">{messages.selectedCount(selectedCount)}</span>
        )}
      </div>
      <div className="sft-pagination__controls">
        <button
          type="button"
          className="sft-btn"
          disabled={page <= 1}
          onClick={() => table.setPage(page - 1)}
        >
          ‹
        </button>
        <span className="sft-pagination__page">{messages.pageOf(page, pageCount)}</span>
        <button
          type="button"
          className="sft-btn"
          disabled={page >= pageCount}
          onClick={() => table.setPage(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
