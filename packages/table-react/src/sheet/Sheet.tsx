import { Plus } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cellAddr, evaluateCell, indexToCol } from './engine';

export interface SheetProps {
  /** initial row count. Users can add more via the "+" button at the bottom row. */
  rows?: number;
  /** initial column count. Users can add more via the "+" button at the last column. */
  cols?: number;
  /** initial raw cell values keyed by address (e.g. { A1: '10', B1: '=A1*2' }) */
  initial?: Record<string, string>;
  onChange?: (cells: Record<string, string>) => void;
  className?: string;
}

const DEFAULT_COL_WIDTH = 96;
const DEFAULT_ROW_HEIGHT = 28;
const MIN_COL_WIDTH = 40;
const MIN_ROW_HEIGHT = 20;

/**
 * Sheet — a minimal spreadsheet: A1-addressed editable grid with formulas
 * (=A1+B1, =SUM(A1:A3)). Positional, not schema-bound — a separate track from
 * the data Table/DataGrid. Click to select, double-click or type to edit;
 * Enter commits + moves down, Tab moves right, Esc cancels.
 *
 * Google Sheets / Excel / Numbers parity: drag a column's right edge or a row's
 * bottom edge to resize it; a "+" at the end of the last column / below the last
 * row appends another column / row.
 */
export function Sheet({
  rows = 20,
  cols = 8,
  initial = {},
  onChange,
  className,
}: SheetProps): ReactNode {
  const [cells, setCells] = useState<Record<string, string>>(initial);
  const [rowCount, setRowCount] = useState(rows);
  const [colCount, setColCount] = useState(cols);
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [active, setActive] = useState<{ c: number; r: number }>({ c: 0, r: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const gridRef = useRef<HTMLDivElement | null>(null);

  const getRaw = useMemo(() => (addr: string) => cells[addr] ?? '', [cells]);
  const colWidth = (c: number) => colWidths[c] ?? DEFAULT_COL_WIDTH;
  const rowHeight = (r: number) => rowHeights[r] ?? DEFAULT_ROW_HEIGHT;

  const focusGrid = () => gridRef.current?.focus();

  const commit = (addr: string, value: string, move: 'down' | 'right' | null) => {
    setCells((prev) => {
      const next = { ...prev, [addr]: value };
      onChange?.(next);
      return next;
    });
    setEditing(false);
    if (move === 'down') setActive((a) => ({ c: a.c, r: Math.min(rowCount - 1, a.r + 1) }));
    else if (move === 'right') setActive((a) => ({ c: Math.min(colCount - 1, a.c + 1), r: a.r }));
    requestAnimationFrame(focusGrid);
  };

  const startEdit = (initialChar?: string) => {
    const addr = cellAddr(active.c, active.r);
    setDraft(initialChar ?? cells[addr] ?? '');
    setEditing(true);
  };

  const addColumn = () => setColCount((c) => c + 1);
  const addRow = () => setRowCount((r) => r + 1);

  function startColResize(e: ReactPointerEvent<HTMLSpanElement>, c: number) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidth(c);
    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
      setColWidths((w) => ({ ...w, [c]: next }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startRowResize(e: ReactPointerEvent<HTMLSpanElement>, r: number) {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = rowHeight(r);
    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_ROW_HEIGHT, startHeight + (ev.clientY - startY));
      setRowHeights((h) => ({ ...h, [r]: next }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    const { c, r } = active;
    if (e.key === 'ArrowUp') setActive({ c, r: Math.max(0, r - 1) });
    else if (e.key === 'ArrowDown') setActive({ c, r: Math.min(rowCount - 1, r + 1) });
    else if (e.key === 'ArrowLeft') setActive({ c: Math.max(0, c - 1), r });
    else if (e.key === 'ArrowRight') setActive({ c: Math.min(colCount - 1, c + 1), r });
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
        {Array.from({ length: colCount }, (_, c) => (
          <div className="sft-sheet__colhead" key={indexToCol(c)} style={{ width: colWidth(c) }}>
            {indexToCol(c)}
            <span
              className="sft-sheet__col-resizer"
              onPointerDown={(e) => startColResize(e, c)}
              aria-hidden="true"
            />
          </div>
        ))}
        <button
          type="button"
          className="sft-sheet__addcol"
          onClick={addColumn}
          aria-label="add column"
          title="열 추가"
        >
          <Plus size={14} />
        </button>
      </div>

      {Array.from({ length: rowCount }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional grid
        <div className="sft-sheet__row" key={r} style={{ height: rowHeight(r) }}>
          <div className="sft-sheet__rowhead">
            {r + 1}
            <span
              className="sft-sheet__row-resizer"
              onPointerDown={(e) => startRowResize(e, r)}
              aria-hidden="true"
            />
          </div>
          {Array.from({ length: colCount }, (_, c) => {
            const addr = cellAddr(c, r);
            const isActive = active.c === c && active.r === r;
            const isEditing = editing && isActive;
            return (
              <div
                key={addr}
                className="sft-sheet__cell"
                data-active={isActive || undefined}
                style={{ width: colWidth(c) }}
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

      <div className="sft-sheet__row sft-sheet__row--addrow">
        <button
          type="button"
          className="sft-sheet__addrow"
          onClick={addRow}
          aria-label="add row"
          title="행 추가"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
