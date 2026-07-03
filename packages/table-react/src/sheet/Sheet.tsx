import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Italic,
  PaintBucket,
  Plus,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
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

interface CellPos {
  c: number;
  r: number;
}

/** one rectangular selection: `anchor` is its own editable cell, `focus` is
 * the far corner it's dragged/extended to. A single cell is anchor===focus. */
interface CellRange {
  anchor: CellPos;
  focus: CellPos;
}

interface CellRect {
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
}

function rectOf(range: CellRange): CellRect {
  return {
    minC: Math.min(range.anchor.c, range.focus.c),
    maxC: Math.max(range.anchor.c, range.focus.c),
    minR: Math.min(range.anchor.r, range.focus.r),
    maxR: Math.max(range.anchor.r, range.focus.r),
  };
}

type CellAlign = 'left' | 'center' | 'right';

/** per-cell character formatting, applied from the toolbar to the selection.
 * Separate from cell *values* so it can be undone/serialized independently. */
interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** text color (any CSS color) */
  color?: string;
  /** fill / background color */
  bg?: string;
  /** per-cell horizontal align, overriding the column's type-based default */
  align?: CellAlign;
}

type BoolFormatKey = 'bold' | 'italic' | 'underline' | 'strike';

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function roundNum(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

/**
 * Excel/Sheets-style autofill series detection. Given the raw source cells
 * in fill order, returns a function producing the raw value `offset` cells
 * past the source (1-based) — or null if no recognizable series exists, so
 * the caller falls back to cyclically repeating the source block.
 *
 * Recognizes: arithmetic numeric sequences (1,2,3,4 → 5,6,7 / 2,4,6,8 →
 * 10,12 / 1,1,1,1 → 1,1,1, a constant is just step-0 arithmetic) and the
 * Korean weekday cycle (월,화,수,목 → 금,토,일).
 */
function makeSeriesExtender(rawValues: string[]): ((offset: number) => string) | null {
  const trimmed = rawValues.map((v) => v.trim());
  if (trimmed.length < 2 || trimmed.some((v) => v.startsWith('='))) return null;

  if (trimmed.every((v) => v !== '' && !Number.isNaN(Number(v)))) {
    const nums = trimmed.map(Number);
    const step = nums[1]! - nums[0]!;
    const isArithmetic = nums.every((n, i) => i === 0 || Math.abs(n - nums[i - 1]! - step) < 1e-9);
    if (isArithmetic) {
      const last = nums[nums.length - 1]!;
      return (offset: number) => String(roundNum(last + step * offset));
    }
  }

  const idxs = trimmed.map((v) => WEEKDAYS_KO.indexOf(v));
  if (idxs.every((i) => i >= 0)) {
    const step = (((idxs[1]! - idxs[0]!) % 7) + 7) % 7;
    const stepOk = idxs.every((i, k) => k === 0 || (idxs[k - 1]! + step) % 7 === i);
    if (stepOk) {
      const lastIdx = idxs[idxs.length - 1]!;
      return (offset: number) => WEEKDAYS_KO[(((lastIdx + step * offset) % 7) + 7) % 7]!;
    }
  }

  return null;
}

const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 34;
const MIN_COL_WIDTH = 48;
const MIN_ROW_HEIGHT = 22;
/** fixed width of the row-header column */
const ROW_HEAD_WIDTH = 48;
/** fixed height of the column-header row */
const HEADER_HEIGHT = 34;

/**
 * Sheet — a minimal spreadsheet: A1-addressed editable grid with formulas
 * (=A1+B1, =SUM(A1:A3)). Positional, not schema-bound — a separate track from
 * the data Table/DataGrid. Click to select, double-click or type to edit;
 * Enter commits + moves down, Tab moves right, Esc cancels.
 *
 * Google Sheets / Excel / Numbers parity:
 *   - click a column letter / row number to select the whole column/row; only
 *     then does dragging its edge resize it (double-click the edge to auto-fit)
 *   - a "+" past the last column / below the last row appends another,
 *     sized exactly like a real column/row; below the last row, a faint
 *     gridline previews the row that would be created
 *   - click-drag or shift-click selects a rectangular range of cells; the
 *     range boundary is one floating overlay computed from column/row offsets
 *     (not per-cell borders), so it never gets clipped at cell edges
 *   - Cmd/Ctrl-click (or Cmd/Ctrl-drag) adds a separate, disjoint range
 *     without clearing the existing ones — each renders its own outline
 *   - selecting a column/row header releases any active cell-range selection,
 *     matching Sheets (only one selection kind is visually active at a time)
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
  // per-cell character formatting (bold, colors, …) keyed by address
  const [formats, setFormats] = useState<Record<string, CellFormat>>({});
  // undo / redo stacks. Each entry is a full {cells, formats} document
  // snapshot; taken just before a mutating action (snapshot()).
  const [past, setPast] = useState<
    { cells: Record<string, string>; formats: Record<string, CellFormat> }[]
  >([]);
  const [future, setFuture] = useState<
    { cells: Record<string, string>; formats: Record<string, CellFormat> }[]
  >([]);
  // Cell-range selection: a list so Cmd/Ctrl-click can add disjoint ranges
  // (Sheets/Excel parity); the *last* one is "active" — it owns the
  // editable/anchor cell, keyboard nav, and the fill handle.
  const [ranges, setRanges] = useState<CellRange[]>([
    { anchor: { c: 0, r: 0 }, focus: { c: 0, r: 0 } },
  ]);
  const [dragging, setDragging] = useState(false);
  // fill handle (bottom-right dot of the range outline): dragging it extends
  // the selection down or right and repeats the source range into the new
  // cells, Excel/Sheets "fill" style
  const [fillDragging, setFillDragging] = useState(false);
  const [fillEnd, setFillEnd] = useState<CellPos | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Excel-style whole-column / whole-row selection: only the selected header's
  // edge can be dragged to resize. Selecting one releases the cell range
  // (Google Sheets: only one selection kind is shown at a time).
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const getRaw = useMemo(() => (addr: string) => cells[addr] ?? '', [cells]);
  const colWidth = (c: number) => colWidths[c] ?? DEFAULT_COL_WIDTH;
  const rowHeight = (r: number) => rowHeights[r] ?? DEFAULT_ROW_HEIGHT;

  const focusGrid = () => gridRef.current?.focus();

  // cumulative pixel offsets, used to place the floating selection overlay
  // without measuring the DOM
  const colOffsets = useMemo(() => {
    const offsets: number[] = [];
    let x = ROW_HEAD_WIDTH;
    for (let c = 0; c < colCount; c++) {
      offsets.push(x);
      x += colWidth(c);
    }
    offsets.push(x);
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount, colWidths]);

  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = HEADER_HEIGHT;
    for (let r = 0; r < rowCount; r++) {
      offsets.push(y);
      y += rowHeight(r);
    }
    offsets.push(y);
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowCount, rowHeights]);

  const activeRange = ranges[ranges.length - 1]!;
  const anchor = activeRange.anchor;
  const focus = activeRange.focus;
  const minC = Math.min(anchor.c, focus.c);
  const maxC = Math.max(anchor.c, focus.c);
  const minR = Math.min(anchor.r, focus.r);
  const maxR = Math.max(anchor.r, focus.r);

  const rangeRects = useMemo(() => ranges.map(rectOf), [ranges]);

  // true when (c, r) sits inside some range but isn't that specific range's
  // own anchor cell — the anchor is left untinted so it still reads as the
  // one editable cell within its range (Sheets parity), for every range
  const cellTinted = (c: number, r: number) => {
    for (let i = 0; i < ranges.length; i++) {
      const rect = rangeRects[i]!;
      if (c < rect.minC || c > rect.maxC || r < rect.minR || r > rect.maxR) continue;
      const rng = ranges[i]!;
      const isMulti = rect.minC !== rect.maxC || rect.minR !== rect.maxR;
      if (isMulti && !(rng.anchor.c === c && rng.anchor.r === r)) return true;
    }
    return false;
  };

  // only one selection kind renders at a time: picking a column/row header
  // releases every cell-range outline entirely
  const rangeOutlines =
    selectedCol == null && selectedRow == null
      ? ranges.map((_, i) => {
          const rect = rangeRects[i]!;
          return {
            left: colOffsets[rect.minC]!,
            top: rowOffsets[rect.minR]!,
            width: colOffsets[rect.maxC + 1]! - colOffsets[rect.minC]!,
            height: rowOffsets[rect.maxR + 1]! - rowOffsets[rect.minR]!,
            isActive: i === ranges.length - 1,
          };
        })
      : [];

  // the active (last) range's focus corner — used while dragging to grow a
  // range, and by keyboard shift-extend
  const setActiveFocus = (pos: CellPos) => {
    setRanges((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1]!, focus: pos };
      return next;
    });
  };

  // the fill handle only extends outward from the range's bottom-right
  // corner: whichever axis (down vs right) the pointer has moved further
  // along wins, matching Sheets' single-axis fill drag
  const fillAxis = (() => {
    if (!fillDragging || !fillEnd) return null;
    const dR = fillEnd.r - maxR;
    const dC = fillEnd.c - maxC;
    if (dR > 0 && dR >= dC) return 'row' as const;
    if (dC > 0) return 'col' as const;
    return null;
  })();

  const fillPreviewRect =
    fillAxis === 'row' && fillEnd
      ? {
          left: colOffsets[minC]!,
          top: rowOffsets[maxR + 1]!,
          width: colOffsets[maxC + 1]! - colOffsets[minC]!,
          height: rowOffsets[fillEnd.r + 1]! - rowOffsets[maxR + 1]!,
        }
      : fillAxis === 'col' && fillEnd
        ? {
            left: colOffsets[maxC + 1]!,
            top: rowOffsets[minR]!,
            width: colOffsets[fillEnd.c + 1]! - colOffsets[maxC + 1]!,
            height: rowOffsets[maxR + 1]! - rowOffsets[minR]!,
          }
        : null;

  useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [dragging]);

  useEffect(() => {
    if (!fillDragging) return;
    const onUp = () => {
      if ((fillAxis === 'row' || fillAxis === 'col') && fillEnd) snapshot();
      if (fillAxis === 'row' && fillEnd) {
        const height = maxR - minR + 1;
        const targetR = fillEnd.r;
        setCells((prev) => {
          const next = { ...prev };
          // each column extends its own series independently, matching how
          // Excel/Sheets fill multiple adjacent series in one drag
          for (let c = minC; c <= maxC; c++) {
            const source = Array.from(
              { length: height },
              (_, i) => prev[cellAddr(c, minR + i)] ?? '',
            );
            const extend = makeSeriesExtender(source);
            for (let r = maxR + 1; r <= targetR; r++) {
              if (extend) {
                next[cellAddr(c, r)] = extend(r - maxR);
              } else {
                const srcR = minR + ((r - minR) % height);
                next[cellAddr(c, r)] = prev[cellAddr(c, srcR)] ?? '';
              }
            }
          }
          onChange?.(next);
          return next;
        });
        setRanges([{ anchor: { c: minC, r: minR }, focus: { c: maxC, r: targetR } }]);
      } else if (fillAxis === 'col' && fillEnd) {
        const width = maxC - minC + 1;
        const targetC = fillEnd.c;
        setCells((prev) => {
          const next = { ...prev };
          for (let r = minR; r <= maxR; r++) {
            const source = Array.from(
              { length: width },
              (_, i) => prev[cellAddr(minC + i, r)] ?? '',
            );
            const extend = makeSeriesExtender(source);
            for (let c = maxC + 1; c <= targetC; c++) {
              if (extend) {
                next[cellAddr(c, r)] = extend(c - maxC);
              } else {
                const srcC = minC + ((c - minC) % width);
                next[cellAddr(c, r)] = prev[cellAddr(srcC, r)] ?? '';
              }
            }
          }
          onChange?.(next);
          return next;
        });
        setRanges([{ anchor: { c: minC, r: minR }, focus: { c: targetC, r: maxR } }]);
      }
      setFillDragging(false);
      setFillEnd(null);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [fillDragging, fillAxis, fillEnd, minC, maxC, minR, maxR, onChange]);

  const selectCell = (c: number, r: number, opts: { shift?: boolean; additive?: boolean } = {}) => {
    setEditing(false);
    setSelectedCol(null);
    setSelectedRow(null);
    if (opts.additive) {
      // Cmd/Ctrl-click: start a new independent range, keeping earlier ones
      setRanges((prev) => [...prev, { anchor: { c, r }, focus: { c, r } }]);
    } else if (opts.shift) {
      // shift-click: extend the active (last) range's far corner only
      setActiveFocus({ c, r });
    } else {
      // plain click: replace the whole selection with a single new range
      setRanges([{ anchor: { c, r }, focus: { c, r } }]);
    }
    // preventDefault() on the triggering mousedown (to stop native text
    // selection while dragging a range) also suppresses the browser's
    // default focus-delegation, so re-focus the grid explicitly
    focusGrid();
  };

  const selectColumn = (c: number) => {
    setSelectedCol(c);
    setSelectedRow(null);
    // move the anchor to the column's top cell so the toolbar reflects it
    setRanges([{ anchor: { c, r: 0 }, focus: { c, r: 0 } }]);
    focusGrid();
  };

  const selectRow = (r: number) => {
    setSelectedRow(r);
    setSelectedCol(null);
    // move the anchor to the row's first cell so the toolbar reflects it
    setRanges([{ anchor: { c: 0, r }, focus: { c: 0, r } }]);
    focusGrid();
  };

  // ── history ────────────────────────────────────────────────
  // record the pre-mutation document so it can be restored by undo. Callers
  // invoke this immediately before changing cells/formats.
  const snapshot = () => {
    setPast((p) => [...p, { cells, formats }]);
    setFuture([]);
  };

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1]!;
    setFuture((f) => [...f, { cells, formats }]);
    setPast((p) => p.slice(0, -1));
    setCells(prev.cells);
    setFormats(prev.formats);
    onChange?.(prev.cells);
  };

  const redo = () => {
    if (!future.length) return;
    const nxt = future[future.length - 1]!;
    setPast((p) => [...p, { cells, formats }]);
    setFuture((f) => f.slice(0, -1));
    setCells(nxt.cells);
    setFormats(nxt.formats);
    onChange?.(nxt.cells);
  };

  // ── selection-wide formatting ──────────────────────────────
  // every cell the current selection covers — a whole column when a column
  // header is picked, a whole row for a row header, otherwise the cell
  // range(s). Toolbar formatting (bold, color, align, …) applies to these.
  const selectedAddrs = (): string[] => {
    const addrs: string[] = [];
    if (selectedCol != null) {
      for (let r = 0; r < rowCount; r++) addrs.push(cellAddr(selectedCol, r));
      return addrs;
    }
    if (selectedRow != null) {
      for (let c = 0; c < colCount; c++) addrs.push(cellAddr(c, selectedRow));
      return addrs;
    }
    for (const rect of rangeRects) {
      for (let r = rect.minR; r <= rect.maxR; r++) {
        for (let c = rect.minC; c <= rect.maxC; c++) addrs.push(cellAddr(c, r));
      }
    }
    return addrs;
  };

  // representative cell whose format drives the toolbar's active states —
  // the top cell of a selected column/row, else the range anchor
  const activeAddr =
    selectedCol != null
      ? cellAddr(selectedCol, 0)
      : selectedRow != null
        ? cellAddr(0, selectedRow)
        : cellAddr(anchor.c, anchor.r);
  const activeFormat = formats[activeAddr] ?? {};
  const activeValue = evaluateCell(activeAddr, getRaw);
  const activeAlign: CellAlign =
    activeFormat.align ?? (typeof activeValue === 'number' ? 'right' : 'left');

  /** toggle a boolean format across the selection: if every cell already has
   * it, clear it everywhere; otherwise set it everywhere (Sheets behaviour) */
  const toggleFormat = (key: BoolFormatKey) => {
    const addrs = selectedAddrs();
    if (!addrs.length) return;
    const allOn = addrs.every((a) => formats[a]?.[key]);
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (const a of addrs) {
        const f: CellFormat = { ...next[a] };
        if (allOn) delete f[key];
        else f[key] = true;
        if (Object.keys(f).length) next[a] = f;
        else delete next[a];
      }
      return next;
    });
    focusGrid();
  };

  /** set (or clear, when value is null) a value-typed format across the selection */
  const setFormatValue = <K extends 'color' | 'bg' | 'align'>(
    key: K,
    value: CellFormat[K] | null,
  ) => {
    const addrs = selectedAddrs();
    if (!addrs.length) return;
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (const a of addrs) {
        const f: CellFormat = { ...next[a] };
        if (value == null) delete f[key];
        else f[key] = value;
        if (Object.keys(f).length) next[a] = f;
        else delete next[a];
      }
      return next;
    });
    focusGrid();
  };

  const commit = (addr: string, value: string, move: 'down' | 'right' | null) => {
    if ((cells[addr] ?? '') !== value) snapshot();
    setCells((prev) => {
      const next = { ...prev, [addr]: value };
      onChange?.(next);
      return next;
    });
    setEditing(false);
    if (move === 'down') {
      const next = { c: anchor.c, r: Math.min(rowCount - 1, anchor.r + 1) };
      setRanges([{ anchor: next, focus: next }]);
    } else if (move === 'right') {
      const next = { c: Math.min(colCount - 1, anchor.c + 1), r: anchor.r };
      setRanges([{ anchor: next, focus: next }]);
    }
    requestAnimationFrame(focusGrid);
  };

  const startEdit = (initialChar?: string) => {
    const addr = cellAddr(anchor.c, anchor.r);
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

  // Resizing is only live once the column/row has been selected via its header
  // (Excel-style): otherwise the handle is visually present but inert. A
  // column's left edge is the same boundary as the previous column's right
  // edge, so both handles resize `targetCol` — only which column is
  // currently selected (and thus showing active handles) differs.
  function startColResize(
    e: ReactPointerEvent<HTMLSpanElement>,
    targetCol: number,
    isActive: boolean,
  ) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidth(targetCol);
    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
      setColWidths((w) => ({ ...w, [targetCol]: next }));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Unlike columns, both row handles resize the *selected* row itself —
  // dragging its top edge up grows the row (direction -1), dragging its
  // bottom edge down also grows it (direction 1). The row above/below never
  // changes size; only the selected row's own height does, either way you
  // grab it.
  function startRowResize(
    e: ReactPointerEvent<HTMLSpanElement>,
    targetRow: number,
    isActive: boolean,
    direction: 1 | -1,
  ) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = rowHeight(targetRow);
    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_ROW_HEIGHT, startHeight + direction * (ev.clientY - startY));
      setRowHeights((h) => ({ ...h, [targetRow]: next }));
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

    // keyboard shortcuts that mirror the toolbar (Cmd/Ctrl on mac/win)
    const mod = e.metaKey || e.ctrlKey;
    if (mod) {
      const k = e.key.toLowerCase();
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (k === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (k === 'b') {
        e.preventDefault();
        toggleFormat('bold');
        return;
      }
      if (k === 'i') {
        e.preventDefault();
        toggleFormat('italic');
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        toggleFormat('underline');
        return;
      }
    }

    const moveTo = (dc: number, dr: number, extend: boolean) => {
      const base = extend ? focus : anchor;
      const next = {
        c: Math.max(0, Math.min(colCount - 1, base.c + dc)),
        r: Math.max(0, Math.min(rowCount - 1, base.r + dr)),
      };
      setSelectedCol(null);
      setSelectedRow(null);
      if (extend) setActiveFocus(next);
      // plain arrow-key movement collapses any disjoint (Cmd-click) ranges
      // back down to a single cell, matching Sheets/Excel navigation
      else setRanges([{ anchor: next, focus: next }]);
    };

    if (e.key === 'ArrowUp') moveTo(0, -1, e.shiftKey);
    else if (e.key === 'ArrowDown') moveTo(0, 1, e.shiftKey);
    else if (e.key === 'ArrowLeft') moveTo(-1, 0, e.shiftKey);
    else if (e.key === 'ArrowRight') moveTo(1, 0, e.shiftKey);
    else if (e.key === 'Enter') startEdit();
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      snapshot();
      setCells((prev) => {
        const next = { ...prev };
        for (const rect of rangeRects) {
          for (let r = rect.minR; r <= rect.maxR; r++) {
            for (let c = rect.minC; c <= rect.maxC; c++) next[cellAddr(c, r)] = '';
          }
        }
        onChange?.(next);
        return next;
      });
      return;
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // without this, the same keystroke that opens the editor also reaches
      // the just-mounted <input> as its native default action, doubling the
      // typed character (e.g. "1" → "11")
      e.preventDefault();
      startEdit(e.key);
      return;
    } else return;
    e.preventDefault();
  }

  // keeps a toolbar button click from blurring the grid / collapsing the
  // current selection before its handler runs
  const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

  return (
    <div className={className ? `sft-sheet-wrap ${className}` : 'sft-sheet-wrap'}>
      <div className="sft-sheet__toolbar" role="toolbar" aria-label="시트 도구 모음">
        <div className="sft-sheet__tb-group">
          <button
            type="button"
            className="sft-sheet__tb-btn"
            onMouseDown={keepFocus}
            onClick={undo}
            disabled={!past.length}
            title="실행 취소 (⌘Z)"
            aria-label="실행 취소"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            onMouseDown={keepFocus}
            onClick={redo}
            disabled={!future.length}
            title="다시 실행 (⌘Y)"
            aria-label="다시 실행"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="sft-sheet__tb-sep" />

        <div className="sft-sheet__tb-group">
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.bold || undefined}
            onMouseDown={keepFocus}
            onClick={() => toggleFormat('bold')}
            title="굵게 (⌘B)"
            aria-label="굵게"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.italic || undefined}
            onMouseDown={keepFocus}
            onClick={() => toggleFormat('italic')}
            title="기울임 (⌘I)"
            aria-label="기울임"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.underline || undefined}
            onMouseDown={keepFocus}
            onClick={() => toggleFormat('underline')}
            title="밑줄 (⌘U)"
            aria-label="밑줄"
          >
            <Underline size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.strike || undefined}
            onMouseDown={keepFocus}
            onClick={() => toggleFormat('strike')}
            title="취소선"
            aria-label="취소선"
          >
            <Strikethrough size={16} />
          </button>
        </div>

        <div className="sft-sheet__tb-sep" />

        <div className="sft-sheet__tb-group">
          <label
            className="sft-sheet__tb-btn sft-sheet__tb-color"
            title="텍스트 색상"
            onMouseDown={keepFocus}
          >
            <Baseline size={16} />
            <span
              className="sft-sheet__tb-color-bar"
              style={{ background: activeFormat.color ?? 'var(--sft-color-text)' }}
            />
            <input
              type="color"
              value={activeFormat.color ?? '#000000'}
              onChange={(e) => setFormatValue('color', e.target.value)}
            />
          </label>
          <label
            className="sft-sheet__tb-btn sft-sheet__tb-color"
            title="채우기 색상"
            onMouseDown={keepFocus}
          >
            <PaintBucket size={16} />
            <span
              className="sft-sheet__tb-color-bar"
              style={{ background: activeFormat.bg ?? 'transparent' }}
            />
            <input
              type="color"
              value={activeFormat.bg ?? '#ffffff'}
              onChange={(e) => setFormatValue('bg', e.target.value)}
            />
          </label>
        </div>

        <div className="sft-sheet__tb-sep" />

        <div className="sft-sheet__tb-group">
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeAlign === 'left' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('align', 'left')}
            title="왼쪽 정렬"
            aria-label="왼쪽 정렬"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeAlign === 'center' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('align', 'center')}
            title="가운데 정렬"
            aria-label="가운데 정렬"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeAlign === 'right' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('align', 'right')}
            title="오른쪽 정렬"
            aria-label="오른쪽 정렬"
          >
            <AlignRight size={16} />
          </button>
        </div>
      </div>

      <div ref={gridRef} className="sft-sheet" tabIndex={0} role="grid" onKeyDown={onGridKeyDown}>
        <div className="sft-sheet__row sft-sheet__row--head">
          <div className="sft-sheet__corner" style={{ width: ROW_HEAD_WIDTH }} />
          {Array.from({ length: colCount }, (_, c) => (
            <div
              className="sft-sheet__colhead"
              key={indexToCol(c)}
              data-selected={selectedCol === c || undefined}
              data-in-range={
                (selectedCol == null &&
                  selectedRow == null &&
                  rangeRects.some((rect) => c >= rect.minC && c <= rect.maxC)) ||
                undefined
              }
              style={{ width: colWidth(c) }}
              onMouseDown={() => selectColumn(c)}
            >
              {indexToCol(c)}
              {/* left edge: same boundary as the previous column's right edge —
                only rendered from B onward, since A has no column to its left */}
              {c > 0 && (
                <span
                  className="sft-sheet__col-resizer sft-sheet__col-resizer--left"
                  data-active={selectedCol === c || undefined}
                  onPointerDown={(e) => startColResize(e, c - 1, selectedCol === c)}
                  onDoubleClick={() => selectedCol === c && autoFitColumn(c - 1)}
                  title="열을 선택한 뒤 드래그: 너비 조절 · 더블클릭: 자동 맞춤"
                  aria-hidden="true"
                />
              )}
              <span
                className="sft-sheet__col-resizer sft-sheet__col-resizer--right"
                data-active={selectedCol === c || undefined}
                onPointerDown={(e) => startColResize(e, c, selectedCol === c)}
                onDoubleClick={() => selectedCol === c && autoFitColumn(c)}
                title="열을 선택한 뒤 드래그: 너비 조절 · 더블클릭: 자동 맞춤"
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
            style={{ width: DEFAULT_COL_WIDTH }}
          >
            <Plus size={14} />
          </button>
        </div>

        {Array.from({ length: rowCount }, (_, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional grid
          <div className="sft-sheet__row" key={r} style={{ height: rowHeight(r) }}>
            <div
              className="sft-sheet__rowhead"
              data-selected={selectedRow === r || undefined}
              data-in-range={
                (selectedCol == null &&
                  selectedRow == null &&
                  rangeRects.some((rect) => r >= rect.minR && r <= rect.maxR)) ||
                undefined
              }
              style={{ width: ROW_HEAD_WIDTH }}
              onMouseDown={() => selectRow(r)}
            >
              {r + 1}
              {/* top edge: only rendered from row 2 onward (row 1 has no row
                above it to show a boundary line against) — but it still
                resizes THIS row, not the one above */}
              {r > 0 && (
                <span
                  className="sft-sheet__row-resizer sft-sheet__row-resizer--top"
                  data-active={selectedRow === r || undefined}
                  onPointerDown={(e) => startRowResize(e, r, selectedRow === r, -1)}
                  onDoubleClick={() => selectedRow === r && autoFitRow(r)}
                  title="행을 선택한 뒤 드래그: 높이 조절 · 더블클릭: 기본 높이로"
                  aria-hidden="true"
                />
              )}
              <span
                className="sft-sheet__row-resizer sft-sheet__row-resizer--bottom"
                data-active={selectedRow === r || undefined}
                onPointerDown={(e) => startRowResize(e, r, selectedRow === r, 1)}
                onDoubleClick={() => selectedRow === r && autoFitRow(r)}
                title="행을 선택한 뒤 드래그: 높이 조절 · 더블클릭: 기본 높이로"
                aria-hidden="true"
              />
            </div>
            {Array.from({ length: colCount }, (_, c) => {
              const addr = cellAddr(c, r);
              const isAnchor = anchor.c === c && anchor.r === r;
              const isEditing = editing && isAnchor;
              const value = evaluateCell(addr, getRaw);
              const fmt = formats[addr] ?? {};
              // Excel default: numbers (incl. formula results) right-align,
              // everything else left-aligns — per-cell format overrides it
              const align: CellAlign = fmt.align ?? (typeof value === 'number' ? 'right' : 'left');
              const contentStyle: CSSProperties = {
                textAlign: align,
                fontWeight: fmt.bold ? 700 : undefined,
                fontStyle: fmt.italic ? 'italic' : undefined,
                textDecoration:
                  [fmt.underline ? 'underline' : '', fmt.strike ? 'line-through' : '']
                    .filter(Boolean)
                    .join(' ') || undefined,
                color: fmt.color,
              };
              return (
                <div
                  key={addr}
                  className="sft-sheet__cell"
                  data-col-idx={c}
                  data-in-range={cellTinted(c, r) || undefined}
                  data-col-selected={selectedCol === c || undefined}
                  data-row-selected={selectedRow === r || undefined}
                  style={{ width: colWidth(c), background: fmt.bg }}
                  onMouseDown={(e) => {
                    // range-select drags would otherwise also trigger the
                    // browser's native text selection across cell contents
                    e.preventDefault();
                    selectCell(c, r, {
                      shift: e.shiftKey,
                      additive: !e.shiftKey && (e.metaKey || e.ctrlKey),
                    });
                    setDragging(true);
                  }}
                  onMouseEnter={() => {
                    if (fillDragging) setFillEnd({ c, r });
                    else if (dragging && !editing) setActiveFocus({ c, r });
                  }}
                  onDoubleClick={() => startEdit()}
                >
                  {isEditing ? (
                    <input
                      // biome-ignore lint/a11y/noAutofocus: editing a freshly-opened cell
                      autoFocus
                      className="sft-sheet__input"
                      style={contentStyle}
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
                    <span className="sft-sheet__value" style={contentStyle}>
                      {String(value)}
                    </span>
                  )}
                </div>
              );
            })}
            {/* faint preview of the column the header "+" would create, drawn
              down every row so the add-column strip reads as part of the grid */}
            <div className="sft-sheet__ghost" style={{ width: DEFAULT_COL_WIDTH }} />
          </div>
        ))}

        <div className="sft-sheet__row sft-sheet__row--addrow">
          <button
            type="button"
            className="sft-sheet__addrow"
            onClick={addRow}
            aria-label="add row"
            title="행 추가"
            style={{ width: ROW_HEAD_WIDTH, height: DEFAULT_ROW_HEIGHT }}
          >
            <Plus size={14} />
          </button>
          {/* faint preview of the row a "+" click would create, across the
            existing columns + the add-column strip corner */}
          {Array.from({ length: colCount }, (_, c) => (
            <div key={indexToCol(c)} className="sft-sheet__ghost" style={{ width: colWidth(c) }} />
          ))}
          <div className="sft-sheet__ghost" style={{ width: DEFAULT_COL_WIDTH }} />
        </div>

        {/* floating selection outline: one overlay per range, sized/positioned
          from column and row offsets, instead of per-cell borders that clip
          at edges. Cmd/Ctrl-click can add more than one of these. */}
        {rangeOutlines.map((ro, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: ranges are appended/replaced, never reordered
            key={i}
            className="sft-sheet__range-outline"
            style={{ left: ro.left, top: ro.top, width: ro.width, height: ro.height }}
          >
            {/* fill handle only on the active range: drag to repeat it down/right */}
            {ro.isActive && !editing && (
              <span
                className="sft-sheet__fill-handle"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFillEnd(null);
                  setFillDragging(true);
                }}
              />
            )}
          </div>
        ))}

        {/* dashed preview of the cells a fill-handle drag would populate */}
        {fillPreviewRect && (
          <div
            className="sft-sheet__fill-preview"
            style={{
              left: fillPreviewRect.left,
              top: fillPreviewRect.top,
              width: fillPreviewRect.width,
              height: fillPreviewRect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
