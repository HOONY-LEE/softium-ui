import type { ColumnAlign, PinSide } from '@softium/table-core';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftToLine,
  ArrowRightToLine,
  Columns3,
  MoveHorizontal,
  Search,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTableContext } from './context';

export interface ToolbarProps {
  /** custom actions rendered on the right (e.g. a "+ Add" button) */
  actions?: ReactNode;
}

/**
 * Toolbar — the table's control surface. Search on the left; column controls and any
 * custom `actions` on the right. The column panel (visibility/rename/pin) and Reset
 * route through the table instance and only ever mutate columnState.
 */
export function Toolbar<T>({ actions }: ToolbarProps = {}): ReactNode {
  const { table, messages, resizeMode, toggleResizeMode } = useTableContext<T>();
  const [open, setOpen] = useState(false);

  // original labels + default alignment by key (immutable)
  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of table.columns) map.set(def.key, def.label);
    return map;
  }, [table.columns]);

  const defAlignByKey = useMemo(() => {
    const map = new Map<string, ColumnAlign>();
    for (const def of table.columns) {
      map.set(def.key, def.align ?? (def.type === 'number' ? 'right' : 'left'));
    }
    return map;
  }, [table.columns]);

  // list columns in their current order, including hidden ones (so they can return)
  const ordered = useMemo(
    () => [...table.getColumnState()].sort((a, b) => a.order - b.order),
    [table],
  );

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
        {actions}
        <div className="sft-toolbar__group">
          <button
            type="button"
            className="sft-btn sft-btn--icon"
            data-active={resizeMode || undefined}
            aria-pressed={resizeMode}
            onClick={toggleResizeMode}
          >
            <MoveHorizontal size={15} />
            {messages.resizeColumns}
          </button>
          <button
            type="button"
            className="sft-btn sft-btn--icon"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Columns3 size={15} />
            {messages.columns}
          </button>
          <button type="button" className="sft-btn sft-btn--ghost" onClick={table.resetColumnState}>
            {messages.reset}
          </button>

          {open && (
            <div className="sft-panel" role="dialog" aria-label={messages.columns}>
              {ordered.map((s) => {
                const original = labelByKey.get(s.key) ?? s.key;
                const pinned: PinSide = s.pinned ?? null;
                const align: ColumnAlign = s.align ?? defAlignByKey.get(s.key) ?? 'left';
                return (
                  <div className="sft-panel__row" key={s.key}>
                    <label className="sft-panel__visible">
                      <input
                        type="checkbox"
                        checked={s.visible}
                        onChange={(e) => table.setColumnVisible(s.key, e.target.checked)}
                      />
                    </label>
                    <input
                      className="sft-panel__rename"
                      type="text"
                      value={s.labelOverride ?? ''}
                      placeholder={original}
                      onChange={(e) => table.renameColumn(s.key, e.target.value)}
                    />
                    <div className="sft-panel__aligns">
                      <PinButton
                        active={align === 'left'}
                        title={messages.alignLeft}
                        onClick={() => table.setColumnAlign(s.key, 'left')}
                      >
                        <AlignLeft size={15} />
                      </PinButton>
                      <PinButton
                        active={align === 'center'}
                        title={messages.alignCenter}
                        onClick={() => table.setColumnAlign(s.key, 'center')}
                      >
                        <AlignCenter size={15} />
                      </PinButton>
                      <PinButton
                        active={align === 'right'}
                        title={messages.alignRight}
                        onClick={() => table.setColumnAlign(s.key, 'right')}
                      >
                        <AlignRight size={15} />
                      </PinButton>
                    </div>
                    <div className="sft-panel__pins">
                      <PinButton
                        active={pinned === 'left'}
                        title={messages.pinLeft}
                        onClick={() =>
                          table.setColumnPinned(s.key, pinned === 'left' ? null : 'left')
                        }
                      >
                        <ArrowLeftToLine size={15} />
                      </PinButton>
                      <PinButton
                        active={pinned === 'right'}
                        title={messages.pinRight}
                        onClick={() =>
                          table.setColumnPinned(s.key, pinned === 'right' ? null : 'right')
                        }
                      >
                        <ArrowRightToLine size={15} />
                      </PinButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PinButtonProps {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}

function PinButton({ active, title, onClick, children }: PinButtonProps): ReactNode {
  return (
    <button
      type="button"
      className="sft-pin"
      data-active={active || undefined}
      title={title}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
