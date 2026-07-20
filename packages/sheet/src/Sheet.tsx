import {
  AlignCenter,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  Baseline,
  Bold,
  ChevronDown,
  Combine,
  DollarSign,
  Eraser,
  Grid3x3,
  Italic,
  Minus,
  PaintBucket,
  Paintbrush,
  Percent,
  Plus,
  Redo2,
  Sigma,
  Strikethrough,
  Underline,
  Undo2,
  WrapText,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SheetToolbar, type ToolbarGroup } from './SheetToolbar';
import {
  DEFAULT_BORDER,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  FONT_FAMILIES,
  HEADER_HEIGHT,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  NUM_FORMATS,
  ROW_HEAD_WIDTH,
} from './constants';
import {
  SUPPORTED_FUNCTIONS,
  cellAddr,
  decimalsOf,
  evaluateCell,
  formatNumber,
  indexToCol,
  shiftFormula,
  withDecimals,
} from './engine';
import { makeSeriesExtender } from './series';
import {
  type BoolFormatKey,
  type CellAlign,
  type CellBorders,
  type CellFormat,
  type CellMerge,
  type CellPos,
  type CellRange,
  type CellRect,
  type CellValign,
  type CellWrap,
  type SheetSnapshot,
  rectOf,
} from './types';

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
  // merged cell blocks (T5)
  const [merges, setMerges] = useState<CellMerge[]>([]);
  // undo / redo stacks. Each entry is a full document snapshot (T10: covers
  // structural changes too — column/row sizing, row/col counts, merges — not
  // just cell values/formats), taken just before a mutating action (snapshot()).
  const [past, setPast] = useState<SheetSnapshot[]>([]);
  const [future, setFuture] = useState<SheetSnapshot[]>([]);
  // which toolbar dropdown (number format / borders / merge / font) is open
  const [openMenu, setOpenMenu] = useState<
    'numfmt' | 'borders' | 'merge' | 'font' | 'functions' | null
  >(null);
  // format painter (T6): armed after clicking the paintbrush button, applies
  // the captured source format to the next cell clicked, then disarms
  const [paintActive, setPaintActive] = useState(false);
  const [paintSource, setPaintSource] = useState<CellFormat>({});
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
  const editInputRef = useRef<HTMLInputElement | null>(null);
  // set right before opening the editor with an inserted "=FUNC()" draft, so
  // the caret lands between the parens instead of at the end of the text
  const pendingCaretRef = useRef<number | null>(null);
  // shadow copy of the last cut/copied block, kept alongside the native OS
  // clipboard (T7 remainder) — "paste values only" (⌘⇧V) is a keydown-driven
  // shortcut, not a native paste event, so it has no ClipboardEvent to read
  // from; it reads this instead, using the values already evaluated at
  // copy/cut time rather than raw formula text
  const internalClipboardRef = useRef<{ values: (string | number)[][] } | null>(null);
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the colWidths state, not the colWidth() reader that is re-created every render — depending on the function would defeat the memo
  const colOffsets = useMemo(() => {
    const offsets: number[] = [];
    let x = ROW_HEAD_WIDTH;
    for (let c = 0; c < colCount; c++) {
      offsets.push(x);
      x += colWidth(c);
    }
    offsets.push(x);
    return offsets;
  }, [colCount, colWidths]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: same as colOffsets — keyed on the rowHeights state, not the per-render rowHeight() reader
  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = HEADER_HEIGHT;
    for (let r = 0; r < rowCount; r++) {
      offsets.push(y);
      y += rowHeight(r);
    }
    offsets.push(y);
    return offsets;
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
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging]);

  // close an open toolbar dropdown (number format / borders / merge) on any
  // click outside it (pointerdown covers mouse + touch + pen)
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.sft-sheet__tb-menu-wrap')) setOpenMenu(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openMenu]);

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
                const srcRaw = prev[cellAddr(c, srcR)] ?? '';
                // formulas shift their relative refs by the repeated row
                // distance instead of pasting verbatim (T12)
                next[cellAddr(c, r)] = srcRaw.startsWith('=')
                  ? shiftFormula(srcRaw, 0, r - srcR)
                  : srcRaw;
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
                const srcRaw = prev[cellAddr(srcC, r)] ?? '';
                next[cellAddr(c, r)] = srcRaw.startsWith('=')
                  ? shiftFormula(srcRaw, c - srcC, 0)
                  : srcRaw;
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
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
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
  // invoke this immediately before changing cells/formats/structure (T10).
  const currentSnapshot = (): SheetSnapshot => ({
    cells,
    formats,
    colWidths,
    rowHeights,
    rowCount,
    colCount,
    merges,
  });

  const applySnapshot = (s: SheetSnapshot) => {
    setCells(s.cells);
    setFormats(s.formats);
    setColWidths(s.colWidths);
    setRowHeights(s.rowHeights);
    setRowCount(s.rowCount);
    setColCount(s.colCount);
    setMerges(s.merges);
    onChange?.(s.cells);
  };

  const snapshot = () => {
    setPast((p) => [...p, currentSnapshot()]);
    setFuture([]);
  };

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1]!;
    setFuture((f) => [...f, currentSnapshot()]);
    setPast((p) => p.slice(0, -1));
    applySnapshot(prev);
  };

  const redo = () => {
    if (!future.length) return;
    const nxt = future[future.length - 1]!;
    setPast((p) => [...p, currentSnapshot()]);
    setFuture((f) => f.slice(0, -1));
    applySnapshot(nxt);
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
  const activeValign: CellValign = activeFormat.valign ?? 'middle';

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

  /** set (or clear, when value is null/undefined) a value-typed format across the selection */
  const setFormatValue = <K extends keyof CellFormat>(
    key: K,
    value: CellFormat[K] | null | undefined,
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

  /** cycle the active selection's decimal-place count by ±1 (T1) */
  const stepDecimals = (delta: number) => {
    const addrs = selectedAddrs();
    if (!addrs.length) return;
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (const a of addrs) {
        const f: CellFormat = { ...next[a] };
        const n = Math.max(0, decimalsOf(f.numFmt) + delta);
        f.numFmt = withDecimals(f.numFmt, n);
        next[a] = f;
      }
      return next;
    });
    focusGrid();
  };

  /** T4 borders: the bounding rect the toolbar's border presets act on —
   * a whole column/row when one is header-selected, else the active range */
  const effectiveRect = (): CellRect =>
    selectedCol != null
      ? { minC: selectedCol, maxC: selectedCol, minR: 0, maxR: rowCount - 1 }
      : selectedRow != null
        ? { minC: 0, maxC: colCount - 1, minR: selectedRow, maxR: selectedRow }
        : { minC, maxC, minR, maxR };

  const applyBordersPreset = (preset: 'all' | 'outer' | 'inner' | 'none') => {
    const rect = effectiveRect();
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (let r = rect.minR; r <= rect.maxR; r++) {
        for (let c = rect.minC; c <= rect.maxC; c++) {
          const addr = cellAddr(c, r);
          const f: CellFormat = { ...next[addr] };
          const b: CellBorders = preset === 'none' ? {} : { ...f.borders };
          if (preset === 'all') {
            b.top = DEFAULT_BORDER;
            b.left = DEFAULT_BORDER;
            if (r === rect.maxR) b.bottom = DEFAULT_BORDER;
            if (c === rect.maxC) b.right = DEFAULT_BORDER;
          } else if (preset === 'outer') {
            if (r === rect.minR) b.top = DEFAULT_BORDER;
            if (r === rect.maxR) b.bottom = DEFAULT_BORDER;
            if (c === rect.minC) b.left = DEFAULT_BORDER;
            if (c === rect.maxC) b.right = DEFAULT_BORDER;
          } else if (preset === 'inner') {
            if (r !== rect.minR) b.top = DEFAULT_BORDER;
            if (c !== rect.minC) b.left = DEFAULT_BORDER;
          }
          if (Object.keys(b).length) f.borders = b;
          else f.borders = undefined;
          if (Object.keys(f).length) next[addr] = f;
          else delete next[addr];
        }
      }
      return next;
    });
    setOpenMenu(null);
    focusGrid();
  };

  /** the merge (if any) covering (c, r) */
  const mergeCovering = (c: number, r: number): CellMerge | undefined =>
    merges.find((m) => c >= m.c && c < m.c + m.colSpan && r >= m.r && r < m.r + m.rowSpan);

  const activeMerge = mergeCovering(anchor.c, anchor.r);

  const mergeSelection = () => {
    const rect = effectiveRect();
    if (rect.minC === rect.maxC && rect.minR === rect.maxR) return;
    snapshot();
    const next: CellMerge = {
      c: rect.minC,
      r: rect.minR,
      colSpan: rect.maxC - rect.minC + 1,
      rowSpan: rect.maxR - rect.minR + 1,
    };
    setMerges((prev) => [
      ...prev.filter(
        (m) =>
          m.c + m.colSpan - 1 < rect.minC ||
          m.c > rect.maxC ||
          m.r + m.rowSpan - 1 < rect.minR ||
          m.r > rect.maxR,
      ),
      next,
    ]);
    setRanges([{ anchor: { c: rect.minC, r: rect.minR }, focus: { c: rect.maxC, r: rect.maxR } }]);
    setSelectedCol(null);
    setSelectedRow(null);
    setOpenMenu(null);
    focusGrid();
  };

  const unmergeSelection = () => {
    const rect = effectiveRect();
    snapshot();
    setMerges((prev) =>
      prev.filter(
        (m) => !(m.c >= rect.minC && m.c <= rect.maxC && m.r >= rect.minR && m.r <= rect.maxR),
      ),
    );
    setOpenMenu(null);
    focusGrid();
  };

  /** T6: clear all character formatting from the selection (⌘\) */
  const clearFormatting = () => {
    const addrs = selectedAddrs();
    if (!addrs.length) return;
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (const a of addrs) delete next[a];
      return next;
    });
    focusGrid();
  };

  /** T6: format painter — arm with the active cell's format, then apply it
   * to whichever single cell is clicked next */
  const startPaintFormat = () => {
    setPaintSource({ ...(formats[activeAddr] ?? {}) });
    setPaintActive(true);
  };

  const applyPaintFormatToAddrs = (addrs: string[]) => {
    if (!addrs.length) return;
    snapshot();
    setFormats((prev) => {
      const next = { ...prev };
      for (const a of addrs) {
        if (Object.keys(paintSource).length) next[a] = { ...paintSource };
        else delete next[a];
      }
      return next;
    });
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

  /** toolbar Σ menu: opens the active cell's editor pre-filled with
   * "=FUNC()" and parks the caret between the parens so the user can type
   * a range straight away */
  const insertFunction = (name: string) => {
    const text = `=${name}()`;
    startEdit(text);
    pendingCaretRef.current = text.length - 1;
  };

  // places the caret once the editor input mounts after insertFunction
  useEffect(() => {
    if (!editing) return;
    const pos = pendingCaretRef.current;
    if (pos == null) return;
    pendingCaretRef.current = null;
    editInputRef.current?.setSelectionRange(pos, pos);
  }, [editing]);

  const addColumn = () => {
    snapshot();
    setColCount((c) => c + 1);
  };
  const addRow = () => {
    snapshot();
    setRowCount((r) => r + 1);
  };

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
    snapshot();
    setColWidths((w) => ({ ...w, [c]: Math.min(400, Math.max(MIN_COL_WIDTH, widest + 16)) }));
  }

  /** Excel-style double-click: reset the row back to the standard height */
  function autoFitRow(r: number) {
    if (!(r in rowHeights)) return;
    snapshot();
    setRowHeights((h) => {
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
    snapshot();
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
    snapshot();
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
      if (e.key === '\\') {
        e.preventDefault();
        clearFormatting();
        return;
      }
      if (k === 'v' && e.shiftKey) {
        e.preventDefault();
        pasteValuesOnly();
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

  // ── clipboard (T7: copy/paste of values + formats, single or multi-cell) ──
  // native browser 'copy'/'paste' events on the focused grid — no document
  // execCommand or navigator.clipboard permission prompt needed. Plain text is
  // TSV (rows \n, cols \t) so it round-trips with Excel/Sheets; a second,
  // custom clipboard type carries our per-cell formats for internal pastes.
  const CLIPBOARD_FORMAT_MIME = 'application/x-softium-sheet-formats';
  // carries the copied block's top-left address so a paste elsewhere can
  // shift formulas' relative refs by the same delta a real drag/paste in
  // Excel/Sheets would (T12) — absent (or stale, e.g. after an external
  // copy) means "don't shift", so external paste text is used verbatim
  const CLIPBOARD_ORIGIN_MIME = 'application/x-softium-sheet-origin';

  function onGridCopy(e: ReactClipboardEvent<HTMLDivElement>) {
    if (editing) return; // let the native <input> handle its own text copy
    e.preventDefault();
    const rect = effectiveRect();
    const rows: string[] = [];
    const fmtByOffset: Record<string, CellFormat> = {};
    const values: (string | number)[][] = [];
    for (let r = rect.minR; r <= rect.maxR; r++) {
      const cols: string[] = [];
      const valueCols: (string | number)[] = [];
      for (let c = rect.minC; c <= rect.maxC; c++) {
        const addr = cellAddr(c, r);
        cols.push(cells[addr] ?? '');
        valueCols.push(evaluateCell(addr, getRaw));
        const fmt = formats[addr];
        if (fmt) fmtByOffset[`${r - rect.minR},${c - rect.minC}`] = fmt;
      }
      rows.push(cols.join('\t'));
      values.push(valueCols);
    }
    e.clipboardData.setData('text/plain', rows.join('\n'));
    e.clipboardData.setData(CLIPBOARD_FORMAT_MIME, JSON.stringify(fmtByOffset));
    e.clipboardData.setData(CLIPBOARD_ORIGIN_MIME, JSON.stringify({ c: rect.minC, r: rect.minR }));
    internalClipboardRef.current = { values };
  }

  /** ⌘X — same capture as copy, then blanks the source cells + their formats */
  function onGridCut(e: ReactClipboardEvent<HTMLDivElement>) {
    if (editing) return;
    onGridCopy(e);
    const rect = effectiveRect();
    snapshot();
    setCells((prev) => {
      const next = { ...prev };
      for (let r = rect.minR; r <= rect.maxR; r++)
        for (let c = rect.minC; c <= rect.maxC; c++) next[cellAddr(c, r)] = '';
      onChange?.(next);
      return next;
    });
    setFormats((prev) => {
      const next = { ...prev };
      for (let r = rect.minR; r <= rect.maxR; r++)
        for (let c = rect.minC; c <= rect.maxC; c++) delete next[cellAddr(c, r)];
      return next;
    });
  }

  /** ⌘⇧V — paste only the evaluated values from the last cut/copy, dropping
   * both formatting and formula text (a formula source pastes its computed
   * number/string, not "=..."); reads the internal shadow clipboard since
   * this shortcut never goes through a native ClipboardEvent */
  function pasteValuesOnly() {
    const clip = internalClipboardRef.current;
    if (!clip || !clip.values.length) return;
    const pasteRows = clip.values.length;
    const pasteCols = Math.max(...clip.values.map((row) => row.length));
    const endC = anchor.c + pasteCols - 1;
    const endR = anchor.r + pasteRows - 1;
    if (endC >= colCount) setColCount(endC + 1);
    if (endR >= rowCount) setRowCount(endR + 1);

    snapshot();
    setCells((prev) => {
      const next = { ...prev };
      for (let r = 0; r < clip.values.length; r++) {
        const row = clip.values[r]!;
        for (let c = 0; c < row.length; c++) {
          next[cellAddr(anchor.c + c, anchor.r + r)] = String(row[c] ?? '');
        }
      }
      onChange?.(next);
      return next;
    });
    setRanges([{ anchor: { c: anchor.c, r: anchor.r }, focus: { c: endC, r: endR } }]);
  }

  function onGridPaste(e: ReactClipboardEvent<HTMLDivElement>) {
    if (editing) return; // let the native <input> handle its own text paste
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    let fmtByOffset: Record<string, CellFormat> = {};
    try {
      fmtByOffset = JSON.parse(e.clipboardData.getData(CLIPBOARD_FORMAT_MIME) || '{}');
    } catch {
      fmtByOffset = {};
    }
    let origin: { c: number; r: number } | null = null;
    try {
      origin = JSON.parse(e.clipboardData.getData(CLIPBOARD_ORIGIN_MIME) || 'null');
    } catch {
      origin = null;
    }
    const grid = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((row, i, arr) => row !== '' || i < arr.length - 1) // drop one trailing blank line
      .map((row) => row.split('\t'));
    if (!grid.length) return;

    const pasteRows = grid.length;
    const pasteCols = Math.max(...grid.map((row) => row.length));
    const endC = anchor.c + pasteCols - 1;
    const endR = anchor.r + pasteRows - 1;
    // Sheets-style: grow the sheet rather than silently dropping cells that
    // fall past the current row/column count
    if (endC >= colCount) setColCount(endC + 1);
    if (endR >= rowCount) setRowCount(endR + 1);
    const dCol = origin ? anchor.c - origin.c : 0;
    const dRow = origin ? anchor.r - origin.r : 0;

    snapshot();
    setCells((prev) => {
      const next = { ...prev };
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r]!;
        for (let c = 0; c < row.length; c++) {
          const raw = row[c] ?? '';
          next[cellAddr(anchor.c + c, anchor.r + r)] =
            origin && raw.startsWith('=') ? shiftFormula(raw, dCol, dRow) : raw;
        }
      }
      onChange?.(next);
      return next;
    });
    if (Object.keys(fmtByOffset).length) {
      setFormats((prev) => {
        const next = { ...prev };
        for (const [key, fmt] of Object.entries(fmtByOffset)) {
          const [dr, dc] = key.split(',').map(Number);
          next[cellAddr(anchor.c + (dc ?? 0), anchor.r + (dr ?? 0))] = fmt;
        }
        return next;
      });
    }
    setRanges([{ anchor: { c: anchor.c, r: anchor.r }, focus: { c: endC, r: endR } }]);
  }

  // keeps a toolbar button click from blurring the grid / collapsing the
  // current selection before its handler runs
  const keepFocus = (e: ReactMouseEvent) => e.preventDefault();

  // Toolbar groups are declared here (not in SheetToolbar) so each one keeps
  // closing over this component's state and handlers instead of threading
  // ~30 props through. SheetToolbar only decides which ones fit.
  const toolbarGroups: ToolbarGroup[] = [
    {
      id: 'history',
      node: (
        <>
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
        </>
      ),
    },
    {
      id: 'text-style',
      node: (
        <>
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
        </>
      ),
    },
    {
      id: 'colors',
      node: (
        <>
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
        </>
      ),
    },
    {
      id: 'align',
      node: (
        <>
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
        </>
      ),
    },
    {
      id: 'valign',
      node: (
        <>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeValign === 'top' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('valign', 'top')}
            title="위쪽 맞춤"
            aria-label="위쪽 맞춤"
          >
            <AlignStartVertical size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeValign === 'middle' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('valign', 'middle')}
            title="가운데 맞춤"
            aria-label="가운데 맞춤"
          >
            <Baseline size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeValign === 'bottom' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('valign', 'bottom')}
            title="아래쪽 맞춤"
            aria-label="아래쪽 맞춤"
          >
            <AlignEndVertical size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.wrap === 'wrap' || undefined}
            onMouseDown={keepFocus}
            onClick={() => setFormatValue('wrap', activeFormat.wrap === 'wrap' ? null : 'wrap')}
            title="텍스트 줄바꿈"
            aria-label="텍스트 줄바꿈"
          >
            <WrapText size={16} />
          </button>
        </>
      ),
    },
    {
      id: 'numfmt',
      node: (
        <>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.numFmt === '$#,##0.00' || undefined}
            onMouseDown={keepFocus}
            onClick={() =>
              setFormatValue('numFmt', activeFormat.numFmt === '$#,##0.00' ? null : '$#,##0.00')
            }
            title="통화 서식"
            aria-label="통화 서식"
          >
            <DollarSign size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={activeFormat.numFmt?.endsWith('%') || undefined}
            onMouseDown={keepFocus}
            onClick={() =>
              setFormatValue('numFmt', activeFormat.numFmt?.endsWith('%') ? null : '0%')
            }
            title="백분율 서식"
            aria-label="백분율 서식"
          >
            <Percent size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            onMouseDown={keepFocus}
            onClick={() => stepDecimals(1)}
            title="소수점 자릿수 늘리기"
            aria-label="소수점 자릿수 늘리기"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            onMouseDown={keepFocus}
            onClick={() => stepDecimals(-1)}
            title="소수점 자릿수 줄이기"
            aria-label="소수점 자릿수 줄이기"
          >
            <Minus size={16} />
          </button>
          <div className="sft-sheet__tb-menu-wrap">
            <button
              type="button"
              className="sft-sheet__tb-btn sft-sheet__tb-btn--wide"
              onMouseDown={keepFocus}
              onClick={() => setOpenMenu((m) => (m === 'numfmt' ? null : 'numfmt'))}
              title="숫자 서식 더보기"
              aria-label="숫자 서식 더보기"
            >
              123 <ChevronDown size={12} />
            </button>
            {openMenu === 'numfmt' && (
              <div className="sft-sheet__tb-menu" role="menu">
                {NUM_FORMATS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className="sft-sheet__tb-menu-item"
                    data-active={activeFormat.numFmt === opt.value || undefined}
                    onMouseDown={keepFocus}
                    onClick={() => {
                      setFormatValue('numFmt', opt.value ?? null);
                      setOpenMenu(null);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      id: 'font',
      node: (
        <>
          <select
            className="sft-sheet__tb-select"
            value={activeFormat.fontFamily ?? ''}
            onMouseDown={keepFocus}
            onChange={(e) => setFormatValue('fontFamily', e.target.value || null)}
            title="글꼴"
            aria-label="글꼴"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="sft-sheet__tb-num"
            min={8}
            max={96}
            value={activeFormat.fontSize ?? ''}
            placeholder="14"
            onMouseDown={keepFocus}
            onChange={(e) =>
              setFormatValue('fontSize', e.target.value ? Number(e.target.value) : null)
            }
            title="글자 크기"
            aria-label="글자 크기"
          />
        </>
      ),
    },
    {
      id: 'borders',
      node: (
        <>
          <div className="sft-sheet__tb-menu-wrap">
            <button
              type="button"
              className="sft-sheet__tb-btn"
              onMouseDown={keepFocus}
              onClick={() => setOpenMenu((m) => (m === 'borders' ? null : 'borders'))}
              title="테두리"
              aria-label="테두리"
            >
              <Grid3x3 size={16} />
            </button>
            {openMenu === 'borders' && (
              <div className="sft-sheet__tb-menu" role="menu">
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={() => applyBordersPreset('all')}
                >
                  전체 테두리
                </button>
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={() => applyBordersPreset('outer')}
                >
                  바깥쪽 테두리
                </button>
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={() => applyBordersPreset('inner')}
                >
                  안쪽 테두리
                </button>
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={() => applyBordersPreset('none')}
                >
                  테두리 없음
                </button>
              </div>
            )}
          </div>

          {/* T5: merge cells */}
          <div className="sft-sheet__tb-menu-wrap">
            <button
              type="button"
              className="sft-sheet__tb-btn"
              data-active={!!activeMerge || undefined}
              onMouseDown={keepFocus}
              onClick={() => setOpenMenu((m) => (m === 'merge' ? null : 'merge'))}
              title="셀 병합"
              aria-label="셀 병합"
            >
              <Combine size={16} />
            </button>
            {openMenu === 'merge' && (
              <div className="sft-sheet__tb-menu" role="menu">
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={mergeSelection}
                >
                  선택 영역 병합
                </button>
                <button
                  type="button"
                  className="sft-sheet__tb-menu-item"
                  onMouseDown={keepFocus}
                  onClick={unmergeSelection}
                  disabled={!activeMerge}
                >
                  병합 해제
                </button>
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      id: 'paint',
      node: (
        <>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={paintActive || undefined}
            onMouseDown={keepFocus}
            onClick={startPaintFormat}
            title="서식 복사"
            aria-label="서식 복사"
          >
            <Paintbrush size={16} />
          </button>
          <button
            type="button"
            className="sft-sheet__tb-btn"
            onMouseDown={keepFocus}
            onClick={clearFormatting}
            title="서식 지우기 (⌘\\)"
            aria-label="서식 지우기"
          >
            <Eraser size={16} />
          </button>
        </>
      ),
    },
    {
      id: 'functions',
      node: (
        <>
          <div className="sft-sheet__tb-menu-wrap">
            <button
              type="button"
              className="sft-sheet__tb-btn sft-sheet__tb-btn--wide"
              onMouseDown={keepFocus}
              onClick={() => setOpenMenu((m) => (m === 'functions' ? null : 'functions'))}
              title="함수 삽입"
              aria-label="함수 삽입"
            >
              <Sigma size={16} /> <ChevronDown size={12} />
            </button>
            {openMenu === 'functions' && (
              <div className="sft-sheet__tb-menu sft-sheet__tb-menu--functions" role="menu">
                {SUPPORTED_FUNCTIONS.map((fn) => (
                  <button
                    key={fn.name}
                    type="button"
                    className="sft-sheet__tb-menu-item"
                    onMouseDown={keepFocus}
                    onClick={() => {
                      insertFunction(fn.name);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="sft-sheet__tb-menu-item-name">{fn.name}</span>
                    <span className="sft-sheet__tb-menu-item-hint">{fn.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ),
    },
  ];

  return (
    <div className={className ? `sft-sheet-wrap ${className}` : 'sft-sheet-wrap'}>
      <SheetToolbar groups={toolbarGroups} ariaLabel="시트 도구 모음" keepFocus={keepFocus} />

      <div
        ref={gridRef}
        className="sft-sheet"
        tabIndex={0}
        role="grid"
        onKeyDown={onGridKeyDown}
        onCopy={onGridCopy}
        onCut={onGridCut}
        onPaste={onGridPaste}
      >
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
              const display =
                typeof value === 'number' && fmt.numFmt ? formatNumber(value, fmt.numFmt) : value;
              const contentStyle: CSSProperties = {
                textAlign: align,
                fontWeight: fmt.bold ? 700 : undefined,
                fontStyle: fmt.italic ? 'italic' : undefined,
                textDecoration:
                  [fmt.underline ? 'underline' : '', fmt.strike ? 'line-through' : '']
                    .filter(Boolean)
                    .join(' ') || undefined,
                color: fmt.color,
                fontFamily: fmt.fontFamily || undefined,
                fontSize: fmt.fontSize ? `${fmt.fontSize}px` : undefined,
                whiteSpace: fmt.wrap === 'wrap' ? 'normal' : 'nowrap',
                overflow: fmt.wrap === 'wrap' ? 'visible' : 'hidden',
              };
              // a merge's covered (non-anchor) cells render nothing — the
              // merge's own overlay (below) draws the union visually
              const coveringMerge = mergeCovering(c, r);
              const isMergeAnchor = coveringMerge?.c === c && coveringMerge?.r === r;
              const hiddenByMerge = !!coveringMerge && !isMergeAnchor;
              return (
                <div
                  key={addr}
                  className="sft-sheet__cell"
                  data-col-idx={c}
                  data-in-range={cellTinted(c, r) || undefined}
                  data-col-selected={selectedCol === c || undefined}
                  data-row-selected={selectedRow === r || undefined}
                  style={{
                    width: colWidth(c),
                    background: isMergeAnchor ? undefined : fmt.bg,
                    alignItems:
                      fmt.valign === 'top'
                        ? 'flex-start'
                        : fmt.valign === 'bottom'
                          ? 'flex-end'
                          : 'center',
                    visibility: hiddenByMerge ? 'hidden' : undefined,
                    borderTop: fmt.borders?.top
                      ? `${fmt.borders.top.width}px ${fmt.borders.top.style} ${fmt.borders.top.color}`
                      : undefined,
                    borderRight: fmt.borders?.right
                      ? `${fmt.borders.right.width}px ${fmt.borders.right.style} ${fmt.borders.right.color}`
                      : undefined,
                    borderBottom: fmt.borders?.bottom
                      ? `${fmt.borders.bottom.width}px ${fmt.borders.bottom.style} ${fmt.borders.bottom.color}`
                      : undefined,
                    borderLeft: fmt.borders?.left
                      ? `${fmt.borders.left.width}px ${fmt.borders.left.style} ${fmt.borders.left.color}`
                      : undefined,
                  }}
                  onPointerDown={(e) => {
                    const target = mergeCovering(c, r);
                    const tc = target?.c ?? c;
                    const tr = target?.r ?? r;
                    if (paintActive) {
                      applyPaintFormatToAddrs([cellAddr(tc, tr)]);
                      setPaintActive(false);
                      selectCell(tc, tr);
                      return;
                    }
                    selectCell(tc, tr, {
                      shift: e.shiftKey,
                      additive: !e.shiftKey && (e.metaKey || e.ctrlKey),
                    });
                    // range-drag is a mouse/pen affordance. On touch we skip it
                    // (and skip preventDefault) so the grid scrolls natively and
                    // the press reads as a plain tap-select. preventDefault on
                    // mouse/pen keeps grid focus + suppresses text-selection.
                    if (e.pointerType !== 'touch') {
                      e.preventDefault();
                      setDragging(true);
                    }
                  }}
                  onMouseEnter={() => {
                    // target tracking during a mouse/pen range or fill drag —
                    // mouse compat events fire during those; touch never starts
                    // a drag (gated above) so this stays a no-op on touch
                    if (fillDragging) setFillEnd({ c, r });
                    else if (dragging && !editing) setActiveFocus({ c, r });
                  }}
                  onDoubleClick={() => !hiddenByMerge && startEdit()}
                >
                  {isEditing ? (
                    <input
                      // biome-ignore lint/a11y/noAutofocus: editing a freshly-opened cell
                      autoFocus
                      ref={editInputRef}
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
                  ) : !hiddenByMerge && !isMergeAnchor ? (
                    <span className="sft-sheet__value" style={contentStyle}>
                      {String(display)}
                    </span>
                  ) : null}
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

        {/* T5 merge overlay: draws the merged block's union visually (value,
          background, alignment) over the individually-hidden cells beneath it,
          same floating-overlay technique as the selection outline below */}
        {merges.map((m) => {
          const anchorAddr = cellAddr(m.c, m.r);
          const mFmt = formats[anchorAddr] ?? {};
          const mValue = evaluateCell(anchorAddr, getRaw);
          const mAlign: CellAlign = mFmt.align ?? (typeof mValue === 'number' ? 'right' : 'left');
          const mDisplay =
            typeof mValue === 'number' && mFmt.numFmt ? formatNumber(mValue, mFmt.numFmt) : mValue;
          return (
            <div
              key={`merge-${anchorAddr}`}
              className="sft-sheet__merge-overlay"
              style={{
                left: colOffsets[m.c]!,
                top: rowOffsets[m.r]!,
                width: colOffsets[m.c + m.colSpan]! - colOffsets[m.c]!,
                height: rowOffsets[m.r + m.rowSpan]! - rowOffsets[m.r]!,
                background: mFmt.bg ?? 'var(--sft-color-bg)',
                justifyContent:
                  mAlign === 'center' ? 'center' : mAlign === 'right' ? 'flex-end' : 'flex-start',
                alignItems:
                  mFmt.valign === 'top'
                    ? 'flex-start'
                    : mFmt.valign === 'bottom'
                      ? 'flex-end'
                      : 'center',
              }}
            >
              {!(editing && anchor.c === m.c && anchor.r === m.r) && (
                <span
                  className="sft-sheet__value"
                  style={{
                    textAlign: mAlign,
                    fontWeight: mFmt.bold ? 700 : undefined,
                    fontStyle: mFmt.italic ? 'italic' : undefined,
                    textDecoration:
                      [mFmt.underline ? 'underline' : '', mFmt.strike ? 'line-through' : '']
                        .filter(Boolean)
                        .join(' ') || undefined,
                    color: mFmt.color,
                    fontFamily: mFmt.fontFamily || undefined,
                    fontSize: mFmt.fontSize ? `${mFmt.fontSize}px` : undefined,
                  }}
                >
                  {String(mDisplay)}
                </span>
              )}
            </div>
          );
        })}

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
                onPointerDown={(e) => {
                  // fill drag tracks the target cell via onMouseEnter, which
                  // fires for mouse/pen but not touch (touch implicitly captures
                  // the pointer), so fill stays a mouse/pen affordance
                  if (e.pointerType === 'touch') return;
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
