import type { ColumnAlign, PinSide } from '@softium/table-core';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftToLine,
  ArrowRightToLine,
  MoveHorizontal,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import { useTableContext } from './context';

/**
 * ColumnEditor — per-column visibility / rename / alignment / pin, plus the
 * resize-mode toggle and reset. Rendered inside the footer settings popup.
 */
export function ColumnEditor<T>(): ReactNode {
  const { table, messages, resizeMode, toggleResizeMode } = useTableContext<T>();

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

  const ordered = useMemo(
    () => [...table.getColumnState()].sort((a, b) => a.order - b.order),
    [table],
  );

  return (
    <div className="sft-coleditor">
      <div className="sft-coleditor__rows">
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
                <MiniButton
                  active={align === 'left'}
                  title={messages.alignLeft}
                  onClick={() => table.setColumnAlign(s.key, 'left')}
                >
                  <AlignLeft size={15} />
                </MiniButton>
                <MiniButton
                  active={align === 'center'}
                  title={messages.alignCenter}
                  onClick={() => table.setColumnAlign(s.key, 'center')}
                >
                  <AlignCenter size={15} />
                </MiniButton>
                <MiniButton
                  active={align === 'right'}
                  title={messages.alignRight}
                  onClick={() => table.setColumnAlign(s.key, 'right')}
                >
                  <AlignRight size={15} />
                </MiniButton>
              </div>
              <div className="sft-panel__pins">
                <MiniButton
                  active={pinned === 'left'}
                  title={messages.pinLeft}
                  onClick={() => table.setColumnPinned(s.key, pinned === 'left' ? null : 'left')}
                >
                  <ArrowLeftToLine size={15} />
                </MiniButton>
                <MiniButton
                  active={pinned === 'right'}
                  title={messages.pinRight}
                  onClick={() => table.setColumnPinned(s.key, pinned === 'right' ? null : 'right')}
                >
                  <ArrowRightToLine size={15} />
                </MiniButton>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sft-coleditor__foot">
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
        <button type="button" className="sft-btn sft-btn--ghost" onClick={table.resetColumnState}>
          {messages.reset}
        </button>
      </div>
    </div>
  );
}

interface MiniButtonProps {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}

function MiniButton({ active, title, onClick, children }: MiniButtonProps): ReactNode {
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
