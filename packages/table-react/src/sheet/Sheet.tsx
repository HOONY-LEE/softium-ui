import { type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { cellAddr, evaluateCell, indexToCol } from './engine';

export interface SheetProps {
  rows?: number;
  cols?: number;
  /** initial raw cell values keyed by address (e.g. { A1: '10', B1: '=A1*2' }) */
  initial?: Record<string, string>;
  onChange?: (cells: Record<string, string>) => void;
  className?: string;
}

/**
 * Sheet — a minimal spreadsheet: A1-addressed editable grid with formulas
 * (=A1+B1, =SUM(A1:A3)). Positional, not schema-bound — a separate track from
 * the data Table/DataGrid. Click to select, double-click or type to edit;
 * Enter commits + moves down, Tab moves right, Esc cancels.
 */
export function Sheet({
  rows = 20,
  cols = 8,
  initial = {},
  onChange,
  className,
}: SheetProps): ReactNode {
  const [cells, setCells] = useState<Record<string, string>>(initial);
  const [active, setActive] = useState<{ c: number; r: number }>({ c: 0, r: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const gridRef = useRef<HTMLDivElement | null>(null);

  const getRaw = useMemo(() => (addr: string) => cells[addr] ?? '', [cells]);

  const focusGrid = () => gridRef.current?.focus();

  const commit = (addr: string, value: string, move: 'down' | 'right' | null) => {
    setCells((prev) => {
      const next = { ...prev, [addr]: value };
      onChange?.(next);
      return next;
    });
    setEditing(false);
    if (move === 'down') setActive((a) => ({ c: a.c, r: Math.min(rows - 1, a.r + 1) }));
    else if (move === 'right') setActive((a) => ({ c: Math.min(cols - 1, a.c + 1), r: a.r }));
    requestAnimationFrame(focusGrid);
  };

  const startEdit = (initialChar?: string) => {
    const addr = cellAddr(active.c, active.r);
    setDraft(initialChar ?? cells[addr] ?? '');
    setEditing(true);
  };

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    const { c, r } = active;
    if (e.key === 'ArrowUp') setActive({ c, r: Math.max(0, r - 1) });
    else if (e.key === 'ArrowDown') setActive({ c, r: Math.min(rows - 1, r + 1) });
    else if (e.key === 'ArrowLeft') setActive({ c: Math.max(0, c - 1), r });
    else if (e.key === 'ArrowRight') setActive({ c: Math.min(cols - 1, c + 1), r });
    else if (e.key === 'Enter') startEdit();
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      const addr = cellAddr(c, r);
      setCells((prev) => {
        const next = { ...prev, [addr]: '' };
        onChange?.(next);
        return next;
      });
      return;
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      startEdit(e.key);
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div
      ref={gridRef}
      className={className ? `sft-sheet ${className}` : 'sft-sheet'}
      tabIndex={0}
      role="grid"
      onKeyDown={onGridKeyDown}
    >
      <div className="sft-sheet__row sft-sheet__row--head">
        <div className="sft-sheet__corner" />
        {Array.from({ length: cols }, (_, c) => (
          <div className="sft-sheet__colhead" key={indexToCol(c)}>
            {indexToCol(c)}
          </div>
        ))}
      </div>

      {Array.from({ length: rows }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional grid
        <div className="sft-sheet__row" key={r}>
          <div className="sft-sheet__rowhead">{r + 1}</div>
          {Array.from({ length: cols }, (_, c) => {
            const addr = cellAddr(c, r);
            const isActive = active.c === c && active.r === r;
            const isEditing = editing && isActive;
            return (
              <div
                key={addr}
                className="sft-sheet__cell"
                data-active={isActive || undefined}
                onMouseDown={() => {
                  setEditing(false);
                  setActive({ c, r });
                }}
                onDoubleClick={() => startEdit()}
              >
                {isEditing ? (
                  <input
                    // biome-ignore lint/a11y/noAutofocus: editing a freshly-opened cell
                    autoFocus
                    className="sft-sheet__input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commit(addr, draft, null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commit(addr, draft, 'down');
                      } else if (e.key === 'Tab') {
                        e.preventDefault();
                        commit(addr, draft, 'right');
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditing(false);
                        focusGrid();
                      }
                    }}
                  />
                ) : (
                  <span className="sft-sheet__value">{String(evaluateCell(addr, getRaw))}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
