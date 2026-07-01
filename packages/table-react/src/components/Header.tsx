import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronUp } from 'lucide-react';
import { type ReactNode, type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';
import type { ResolvedReactColumn } from '../types';
import { cellStyle } from './Cell';
import { INDEX_COL_WIDTH, SELECT_COL_WIDTH, useTableContext } from './context';

export interface HeaderProps<T> {
  columns: ResolvedReactColumn<T>[];
}

const MIN_RESIZE_WIDTH = 48;

export function Header<T>({ columns }: HeaderProps<T>): ReactNode {
  const { table, selectable, settings, scrollX, messages } = useTableContext<T>();
  const sortRules = table.getSortRules();

  const pageRows = table.getRows();
  const selectedOnPage = pageRows.filter((r) => r.selected).length;
  const allSelected = pageRows.length > 0 && selectedOnPage === pageRows.length;
  const someSelected = selectedOnPage > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      table.moveColumn(String(active.id), String(over.id));
    }
  }

  return (
    <div className="sft-thead" role="rowgroup">
      <div className="sft-tr sft-tr--head" role="row">
        {settings.indexColumn && (
          <div
            className="sft-th sft-th--index"
            role="columnheader"
            style={{ flex: `0 0 ${INDEX_COL_WIDTH}px`, width: INDEX_COL_WIDTH }}
          >
            {messages.indexHeader}
          </div>
        )}
        {selectable && (
          <div
            className="sft-th sft-th--select"
            role="columnheader"
            style={{ flex: `0 0 ${SELECT_COL_WIDTH}px`, width: SELECT_COL_WIDTH }}
          >
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              aria-label="select all on page"
              onChange={(e) =>
                table.setRowsSelected(
                  pageRows.map((r) => r.rowId),
                  e.target.checked,
                )
              }
            />
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={columns.map((c) => c.key)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => {
              const ruleIndex = sortRules.findIndex((r) => r.columnKey === column.key);
              const rule = ruleIndex === -1 ? undefined : sortRules[ruleIndex];
              return (
                <HeaderCell
                  key={column.key}
                  column={column}
                  sortDirection={rule?.direction}
                  sortPriority={sortRules.length > 1 && rule ? ruleIndex + 1 : undefined}
                  onResize={(width) => table.setColumnWidth(column.key, width)}
                  onSort={(multi) => table.toggleSort(column.key, multi)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

interface HeaderCellProps<T> {
  column: ResolvedReactColumn<T>;
  sortDirection?: 'asc' | 'desc';
  sortPriority?: number;
  onResize: (width: number) => void;
  onSort: (multi: boolean) => void;
}

function HeaderCell<T>({
  column,
  sortDirection,
  sortPriority,
  onResize,
  onSort,
}: HeaderCellProps<T>): ReactNode {
  const { scrollX, resizeMode, messages } = useTableContext<T>();
  const autoFitHint = messages.autoFitHint;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
    disabled: column.pinned !== null || resizeMode, // no reorder while resizing
  });
  const cellRef = useRef<HTMLDivElement | null>(null);

  const base = cellStyle(column, scrollX);
  const style: React.CSSProperties = {
    ...base,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 'var(--sft-z-overlay)' : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  function startResize(e: ReactPointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = cellRef.current?.getBoundingClientRect().width ?? column.width ?? 120;

    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_RESIZE_WIDTH, startWidth + (ev.clientX - startX));
      onResize(next);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** double-click the handle → fit this column to the widest visible cell + header */
  function autoFit() {
    const root = cellRef.current?.closest('.sft-table');
    if (!root) return;
    const key = window.CSS?.escape ? window.CSS.escape(column.key) : column.key;
    let widest = 0;
    const head = root.querySelector(`.sft-th[data-col-key="${key}"] .sft-th__text`);
    if (head instanceof HTMLElement) widest = head.scrollWidth;
    for (const el of root.querySelectorAll(`.sft-td[data-col-key="${key}"] .sft-td__content`)) {
      if (el instanceof HTMLElement) widest = Math.max(widest, el.scrollWidth);
    }
    if (widest === 0) return;
    const min = column.minWidth ?? MIN_RESIZE_WIDTH;
    const max = column.maxWidth ?? 480;
    // + horizontal cell padding (2×12) + a little breathing room for sort glyphs
    onResize(Math.min(max, Math.max(min, Math.ceil(widest + 32))));
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cellRef.current = node;
      }}
      className="sft-th"
      role="columnheader"
      data-col-key={column.key}
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      data-dragging={isDragging || undefined}
      style={style}
    >
      <span
        className="sft-th__label"
        {...attributes}
        {...listeners}
        onClick={!resizeMode && column.sortable ? (e) => onSort(e.shiftKey) : undefined}
        data-sortable={(!resizeMode && column.sortable) || undefined}
      >
        <span className="sft-th__text">
          {column.renderHeader
            ? column.renderHeader({ column: column.def, displayLabel: column.displayLabel })
            : column.displayLabel}
        </span>
        {sortDirection && (
          <span className="sft-th__sort" aria-hidden="true">
            <ChevronUp
              size={14}
              strokeWidth={2.5}
              style={sortDirection === 'desc' ? { transform: 'rotate(180deg)' } : undefined}
            />
            {sortPriority ? <sup>{sortPriority}</sup> : null}
          </span>
        )}
      </span>
      {resizeMode && column.resizable !== false && (
        <span
          className="sft-th__resizer"
          onPointerDown={startResize}
          onDoubleClick={autoFit}
          title={autoFitHint}
          aria-hidden="true"
          data-testid={`resize-${column.key}`}
        />
      )}
    </div>
  );
}
