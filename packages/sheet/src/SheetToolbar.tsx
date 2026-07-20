import { MoreVertical } from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export interface ToolbarGroup {
  id: string;
  node: ReactNode;
}

interface SheetToolbarProps {
  groups: ToolbarGroup[];
  ariaLabel?: string;
  /** keeps a toolbar click from blurring the grid / collapsing the selection */
  keepFocus?: (e: ReactMouseEvent) => void;
}

/** width the "⋮" trigger needs, plus the gap before it */
const OVERFLOW_SLOT = 38;

/**
 * SheetToolbar — the formatting toolbar with Google-Sheets-style overflow: the
 * bar never wraps, and whatever doesn't fit collapses into a trailing "⋮"
 * button that opens the remaining groups in a popover.
 *
 * Widths come from a hidden, absolutely-positioned copy of every group rather
 * than from the live bar. Two reasons:
 *   - being out of flow, it can't widen the shrink-wrapping .sft-sheet-wrap,
 *     which would otherwise feed its own inflated width back into the fit
 *     calculation and never collapse;
 *   - it stays measurable no matter how much is currently collapsed, so there
 *     is no width cache to go stale.
 * The bar itself therefore keeps `overflow: visible`, which matters because
 * the group dropdowns (number format, borders, Σ …) hang below it.
 */
export function SheetToolbar({ groups, ariaLabel, keepFocus }: SheetToolbarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  // start with nothing in the bar so the first measure reads the container's
  // real width; useLayoutEffect fills it in before the browser paints
  const [visibleCount, setVisibleCount] = useState(0);
  const visibleCountRef = useRef(0);
  const [open, setOpen] = useState(false);

  const measure = useCallback(() => {
    const bar = barRef.current;
    const row = measureRef.current;
    if (!bar || !row) return;

    const rowLeft = row.getBoundingClientRect().left;
    const slots = row.querySelectorAll<HTMLElement>('[data-measure-slot]');
    if (slots.length !== groups.length) return;

    const avail = bar.clientWidth;
    let next = groups.length;
    const totalRight = slots[slots.length - 1]!.getBoundingClientRect().right - rowLeft;
    if (totalRight > avail) {
      next = 0;
      for (let i = 0; i < slots.length; i++) {
        const right = slots[i]!.getBoundingClientRect().right - rowLeft;
        // reserve room for the "⋮" trigger itself
        if (right + OVERFLOW_SLOT <= avail) next = i + 1;
        else break;
      }
    }
    if (next !== visibleCountRef.current) {
      visibleCountRef.current = next;
      setVisibleCount(next);
    }
  }, [groups.length]);

  // before paint, so the bar is never seen empty or overflowing
  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    // ResizeObserver catches container-driven changes (a resizable pane, the
    // sidebar collapsing); the window listener is a fallback for environments
    // where element observation is unavailable
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    ro?.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // close the overflow popover on any click outside it
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.sft-sheet__tb-overflow')) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const overflowed = groups.slice(visibleCount);

  return (
    <div
      className="sft-sheet__toolbar"
      role="toolbar"
      aria-label={ariaLabel}
      ref={barRef}
      data-collapsed={overflowed.length > 0 || undefined}
    >
      {/* out-of-flow width probe: never painted, never focusable, and cannot
        affect the bar's or its parent's layout */}
      <div className="sft-sheet__tb-measure" ref={measureRef} aria-hidden="true">
        {groups.map((g, i) => (
          <div className="sft-sheet__tb-slot" data-measure-slot key={g.id}>
            {i > 0 && <div className="sft-sheet__tb-sep" />}
            <div className="sft-sheet__tb-group">{g.node}</div>
          </div>
        ))}
      </div>

      {/* only the groups that fit; the rest render solely in the popover */}
      {groups.slice(0, visibleCount).map((g, i) => (
        <div className="sft-sheet__tb-slot" key={g.id}>
          {i > 0 && <div className="sft-sheet__tb-sep" />}
          <div className="sft-sheet__tb-group">{g.node}</div>
        </div>
      ))}

      {overflowed.length > 0 && (
        <div className="sft-sheet__tb-overflow">
          <button
            type="button"
            className="sft-sheet__tb-btn"
            data-active={open || undefined}
            onMouseDown={keepFocus}
            onClick={() => setOpen((v) => !v)}
            title="더보기"
            aria-label="더보기"
            aria-haspopup="true"
            aria-expanded={open}
          >
            <MoreVertical size={16} />
          </button>
          {open && (
            <div className="sft-sheet__tb-overflow-panel" role="group" aria-label="더보기">
              {overflowed.map((g) => (
                <div className="sft-sheet__tb-group" key={g.id}>
                  {g.node}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
