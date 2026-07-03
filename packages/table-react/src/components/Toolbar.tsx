import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { EditControls } from './EditControls';
import { ExportMenu } from './ExportMenu';
import { useTableContext } from './context';

export interface ToolbarProps {
  /** custom actions rendered on the right (e.g. a "+ Add" button) */
  actions?: ReactNode;
}

/**
 * Toolbar — search on the left, custom `actions` on the right. Column/table editing
 * lives in the footer settings menu (the gear), not here.
 */
export function Toolbar<T>({ actions }: ToolbarProps = {}): ReactNode {
  const { table, messages, exportable } = useTableContext<T>();
  const search = table.getSearch();

  return (
    <div className="sft-toolbar">
      <div className="sft-toolbar__left">
        <div className="sft-toolbar__search-wrap">
          <span className="sft-toolbar__search-icon" aria-hidden="true">
            <Search size={15} />
          </span>
          <input
            className="sft-toolbar__search"
            type="search"
            value={search.query}
            placeholder={messages.searchPlaceholder}
            onChange={(e) => table.setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="sft-toolbar__right">
        {exportable && <ExportMenu />}
        <EditControls />
        {actions}
      </div>
    </div>
  );
}
