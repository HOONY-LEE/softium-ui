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
import { type ReactNode, type PointerEvent as ReactPointerEvent, useRef } from 'react';
import type { ResolvedReactColumn } from '../types';
import { cellStyle } from './Cell';
import { useTableContext } from './context';

export interface HeaderProps<T> {
  columns: ResolvedReactColumn<T>[];
}

const MIN_RESIZE_WIDTH = 48;

export function Header<T>({ columns }: HeaderProps<T>): ReactNode {
  const { table } = useTableContext<T>();

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={columns.map((c) => c.key)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <HeaderCell
                key={column.key}
                column={column}
                onResize={(width) => table.setColumnWidth(column.key, width)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

interface HeaderCellProps<T> {
  column: ResolvedReactColumn<T>;
  onResize: (width: number) => void;
}

function HeaderCell<T>({ column, onResize }: HeaderCellProps<T>): ReactNode {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
    disabled: column.pinned !== null, // pinned columns stay put
  });
  const cellRef = useRef<HTMLDivElement | null>(null);

  const base = cellStyle(column);
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

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cellRef.current = node;
      }}
      className="sft-th"
      role="columnheader"
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      data-dragging={isDragging || undefined}
      style={style}
    >
      <span className="sft-th__label" {...attributes} {...listeners}>
        {column.renderHeader
          ? column.renderHeader({ column: column.def, displayLabel: column.displayLabel })
          : column.displayLabel}
      </span>
      {column.resizable !== false && (
        <span
          className="sft-th__resizer"
          onPointerDown={startResize}
          aria-hidden="true"
          data-testid={`resize-${column.key}`}
        />
      )}
    </div>
  );
}
