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
/** faint preview strip past the last real column/row, hinting the grid continues */
const GHOST_COLS = 3;
const GHOST_ROWS = 3;

/**
 * Sheet — a minimal spreadsheet: A1-addressed editable grid with formulas
 * (=A1+B1, =SUM(A1:A3)). Positional, not schema-bound — a separate track from
 * the data Table/DataGrid. Click to select, double-click or type to edit;
 * Enter commits + moves down, Tab moves right, Esc cancels.
 *
 * Google Sheets / Excel / Numbers parity: drag a column's right edge or a row's
 * bottom edge to resize it (double-click to auto-fit); a "+" at the end of the
 * last column / below the last row appends another column / row; a faint
 * gridline preview past the edge hints the sheet keeps going.
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

  /** Excel-style double-click: fit the column to its widest visible value */
  function autoFitColumn(c: number) {
    const root = gridRef.current;
    if (!root) return;
    let widest = 0;
    for (const el of root.querySelectorAll(
      `.sft-sheet__cell[data-col-idx="${c}"] .sft-sheet__value`,
    )) {
      if (el instanceof HTMLElement) widest = Math.max(widest, el.scrollWidth);
    }
    if (widest === 0) return;
    setColWidths((w) => ({ ...w, [c]: Math.min(400, Math.max(MIN_COL_WIDTH, widest + 16)) }));
  }

  /** Excel-style double-click: reset the row back to the standard height */
  function autoFitRow(r: number) {
    setRowHeights((h) => {
      if (!(r in h)) return h;
      const next = { ...h };
      delete next[r];
      return next;
    });
  }

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
              onDoubleClick={() => autoFitColumn(c)}
              title="더블클릭: 너비 자동 맞춤"
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
        {Array.from({ length: GHOST_COLS }, (_, g) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: purely decorative filler
          <div key={g} className="sft-sheet__ghost" style={{ width: DEFAULT_COL_WIDTH }} />
        ))}
      </div>

      {Array.from({ length: rowCount }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional grid
        <div className="sft-sheet__row" key={r} style={{ height: rowHeight(r) }}>
          <div className="sft-sheet__rowhead">
            {r + 1}
            <span
              className="sft-sheet__row-resizer"
              onPointerDown={(e) => startRowResize(e, r)}
              onDoubleClick={() => autoFitRow(r)}
              title="더블클릭: 기본 높이로"
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
                data-col-idx={c}
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
          <div
            className="sft-sheet__ghost"
            style={{ width: 28 + GHOST_COLS * DEFAULT_COL_WIDTH }}
          />
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
        {Array.from({ length: colCount }, (_, c) => (
          <div key={indexToCol(c)} className="sft-sheet__ghost" style={{ width: colWidth(c) }} />
        ))}
        <div className="sft-sheet__ghost" style={{ width: 28 + GHOST_COLS * DEFAULT_COL_WIDTH }} />
      </div>

      {Array.from({ length: GHOST_ROWS }, (_, g) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: purely decorative filler
        <div className="sft-sheet__row sft-sheet__row--ghost" key={g}>
          <div className="sft-sheet__ghost" style={{ width: 44 }} />
          {Array.from({ length: colCount }, (_, c) => (
            <div key={indexToCol(c)} className="sft-sheet__ghost" style={{ width: colWidth(c) }} />
          ))}
          <div
            className="sft-sheet__ghost"
            style={{ width: 28 + GHOST_COLS * DEFAULT_COL_WIDTH }}
          />
        </div>
      ))}
    </div>
  );
}
