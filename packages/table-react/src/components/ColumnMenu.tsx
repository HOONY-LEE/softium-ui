/**
 * ColumnMenu — the per-column "⋮" header menu (ag-Grid style).
 *
 * The trigger sits at the trailing edge of a header cell and fades in on hover; it
 * stays visible while the menu is open or while the column carries a sort/filter,
 * so an active column never looks idle.
 *
 * The panel is rendered through a portal: `.sft-th` is `overflow: hidden` and the
 * scroll container clips too, so an in-flow popover would be cut off. Fixed
 * positioning is computed from the trigger's rect, clamped into the viewport, and
 * flipped above the header when there isn't room below. Because a fixed panel can't
 * follow its anchor, any scroll outside the panel closes it.
 */

import type { PinSide } from '@softium/table-core';
import {
  ArrowDownWideNarrow,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpNarrowWide,
  Ban,
  EyeOff,
  Filter as FilterIcon,
  MoreVertical,
  MoveHorizontal,
  RotateCcw,
  StretchHorizontal,
  X,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ResolvedReactColumn } from '../types';
import { ColumnFilter } from './ColumnFilter';
import { fitColumnWidth } from './autoFit';
import { useTableContext } from './context';

/** panel width (px) — mirrored in CSS as `.sft-colmenu { width }` */
const MENU_WIDTH = 248;
/** below this much room the panel flips above the header instead */
const MIN_SPACE_BELOW = 260;
/** gap between the trigger and the panel */
const OFFSET = 4;
/** viewport inset the panel is never allowed to cross */
const EDGE = 8;

interface Anchored {
  left: number;
  /** set when the panel hangs below the trigger */
  top?: number;
  /** set when the panel is flipped above the trigger */
  bottom?: number;
  maxHeight: number;
}

function anchorTo(el: HTMLElement): Anchored {
  const r = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom - EDGE;
  const spaceAbove = r.top - EDGE;
  // right-align to the trigger, then clamp so the panel stays fully on screen
  const left = Math.max(
    EDGE,
    Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - EDGE),
  );

  if (spaceBelow >= MIN_SPACE_BELOW || spaceBelow >= spaceAbove) {
    return { left, top: r.bottom + OFFSET, maxHeight: spaceBelow - OFFSET };
  }
  return {
    left,
    bottom: window.innerHeight - r.top + OFFSET,
    maxHeight: spaceAbove - OFFSET,
  };
}

export interface ColumnMenuProps<T> {
  column: ResolvedReactColumn<T>;
  /** the column's current sort direction, when sorted */
  sortDirection?: 'asc' | 'desc';
  /** whether this column currently has an active filter */
  filtered: boolean;
}

export function ColumnMenu<T>({ column, sortDirection, filtered }: ColumnMenuProps<T>): ReactNode {
  const { table, messages } = useTableContext<T>();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<Anchored | null>(null);
  // bumping this remounts the filter editor, resetting its local operator/value
  // state after a "clear filter" (the editors seed themselves on mount)
  const [filterSeq, setFilterSeq] = useState(0);

  const open = anchor !== null;
  const close = useCallback(() => setAnchor(null), []);

  function toggle() {
    if (open) close();
    else if (btnRef.current) setAnchor(anchorTo(btnRef.current));
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    }
    // a fixed panel can't track its anchor, so any scroll that isn't the panel's
    // own (e.g. a long set-filter list) dismisses it rather than leaving it adrift
    function onScroll(e: Event) {
      const target = e.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      close();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  function autosize(all: boolean) {
    const root = btnRef.current?.closest('.sft-table');
    if (!root) return;
    const targets = all ? table.getRenderColumns() : [column];
    for (const c of targets) {
      if (c.resizable === false) continue;
      const width = fitColumnWidth(root, c.key, { minWidth: c.minWidth, maxWidth: c.maxWidth });
      if (width !== null) table.setColumnWidth(c.key, width);
    }
    close();
  }

  function setSort(direction: 'asc' | 'desc' | null) {
    table.setSortRules(direction ? [{ columnKey: column.key, direction }] : []);
  }

  function setPinned(side: PinSide) {
    table.setColumnPinned(column.key, side);
  }

  const pinned: PinSide = column.pinned;
  const showFilter = column.filterVariant !== 'none';

  const panel = anchor && (
    <>
      <button type="button" className="sft-colmenu__backdrop" aria-label="close" onClick={close} />
      <div
        ref={panelRef}
        className="sft-colmenu"
        role="menu"
        aria-label={`${column.displayLabel} — ${messages.columnMenu}`}
        style={{
          left: anchor.left,
          top: anchor.top,
          bottom: anchor.bottom,
          maxHeight: anchor.maxHeight,
        }}
      >
        {column.sortable && (
          <div className="sft-colmenu__group">
            <MenuItem
              icon={<ArrowUpNarrowWide size={15} />}
              label={messages.sortAsc}
              active={sortDirection === 'asc'}
              onClick={() => setSort('asc')}
            />
            <MenuItem
              icon={<ArrowDownWideNarrow size={15} />}
              label={messages.sortDesc}
              active={sortDirection === 'desc'}
              onClick={() => setSort('desc')}
            />
            {sortDirection && (
              <MenuItem
                icon={<X size={15} />}
                label={messages.clearSort}
                onClick={() => setSort(null)}
              />
            )}
          </div>
        )}

        {showFilter && (
          <div className="sft-colmenu__group">
            <div className="sft-colmenu__heading">
              <FilterIcon size={13} aria-hidden="true" />
              <span>{messages.filterLabel}</span>
              {filtered && (
                <button
                  type="button"
                  className="sft-colmenu__clear"
                  onClick={() => {
                    table.setColumnFilter(column.key, null);
                    setFilterSeq((n) => n + 1);
                  }}
                >
                  {messages.clearFilter}
                </button>
              )}
            </div>
            <ColumnFilter key={filterSeq} column={column} />
          </div>
        )}

        {column.pinnable && (
          <div className="sft-colmenu__group">
            <div className="sft-colmenu__heading">{messages.pinColumn}</div>
            <MenuItem
              icon={<ArrowLeftToLine size={15} />}
              label={messages.pinLeft}
              active={pinned === 'left'}
              onClick={() => setPinned(pinned === 'left' ? null : 'left')}
            />
            <MenuItem
              icon={<ArrowRightToLine size={15} />}
              label={messages.pinRight}
              active={pinned === 'right'}
              onClick={() => setPinned(pinned === 'right' ? null : 'right')}
            />
            <MenuItem
              icon={<Ban size={15} />}
              label={messages.noPin}
              active={pinned === null}
              onClick={() => setPinned(null)}
            />
          </div>
        )}

        <div className="sft-colmenu__group">
          <MenuItem
            icon={<MoveHorizontal size={15} />}
            label={messages.autosizeColumn}
            onClick={() => autosize(false)}
          />
          <MenuItem
            icon={<StretchHorizontal size={15} />}
            label={messages.autosizeAll}
            onClick={() => autosize(true)}
          />
        </div>

        <div className="sft-colmenu__group">
          {column.hideable && (
            <MenuItem
              icon={<EyeOff size={15} />}
              label={messages.hideColumn}
              onClick={() => {
                table.setColumnVisible(column.key, false);
                close();
              }}
            />
          )}
          <MenuItem
            icon={<RotateCcw size={15} />}
            label={messages.resetColumns}
            onClick={() => {
              table.resetColumnState();
              close();
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="sft-th__menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title={messages.columnMenu}
        aria-label={`${column.displayLabel} — ${messages.columnMenu}`}
        data-open={open || undefined}
        data-active={filtered || Boolean(sortDirection) || undefined}
        // the header label owns the drag/sort gestures; keep them out of the trigger
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        {filtered ? <FilterIcon size={13} /> : <MoreVertical size={15} />}
      </button>
      {panel && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, active, onClick }: MenuItemProps): ReactNode {
  return (
    <button
      type="button"
      className="sft-colmenu__item"
      role="menuitem"
      data-active={active || undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
