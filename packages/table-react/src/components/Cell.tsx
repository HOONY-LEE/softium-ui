import type { Row } from '@softium/table-core';
import { Check } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ResolvedReactColumn } from '../types';
import { useTableContext } from './context';

export interface CellProps<T> {
  row: Row<T>;
  column: ResolvedReactColumn<T>;
}

/** Default value formatting per column type. Custom renderers bypass this entirely. */
function formatValue(value: unknown, type: ResolvedReactColumn<unknown>['type']): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  switch (type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'boolean':
      return value ? <Check size={15} /> : '';
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    default:
      return String(value);
  }
}

export function Cell<T>({ row, column }: CellProps<T>): ReactNode {
  const {
    scrollX,
    editable,
    activeCell,
    setActiveCell,
    editingCell,
    beginEdit,
    commitEdit,
    cancelEdit,
  } = useTableContext<T>();
  const value = row.data[column.key];

  const canEdit = editable && column.editable;
  const isEditing =
    canEdit && editingCell?.rowId === row.rowId && editingCell?.columnKey === column.key;
  const isActive =
    canEdit && activeCell?.rowId === row.rowId && activeCell?.columnKey === column.key;

  // keep the focus ring on the selected cell so keyboard (Enter/F2/Escape) works
  const cellRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isActive && !isEditing) cellRef.current?.focus({ preventScroll: true });
  }, [isActive, isEditing]);

  const content = column.renderCell
    ? column.renderCell({ row, column: column.def, value })
    : formatValue(value, column.type);

  const select = () => {
    if (!isActive) setActiveCell({ rowId: row.rowId, columnKey: column.key });
  };
  const onClick = () => {
    // a second click on the already-selected cell enters edit mode (AG-Grid style)
    if (isActive && !isEditing) beginEdit(row.rowId, column.key);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      beginEdit(row.rowId, column.key);
    } else if (e.key === 'Escape') {
      setActiveCell(null);
    }
  };

  return (
    <div
      ref={cellRef}
      className="sft-td"
      role="cell"
      data-col-key={column.key}
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      data-editable={canEdit || undefined}
      data-active={(isActive && !isEditing) || undefined}
      data-editing={isEditing || undefined}
      tabIndex={canEdit ? (isActive ? 0 : -1) : undefined}
      style={cellStyle(column, scrollX)}
      onMouseDown={canEdit && !isEditing ? select : undefined}
      onClick={canEdit ? onClick : undefined}
      onDoubleClick={canEdit && !isEditing ? () => beginEdit(row.rowId, column.key) : undefined}
      onKeyDown={canEdit ? onKeyDown : undefined}
    >
      {isEditing ? (
        <CellEditor
          initial={value}
          type={column.type}
          onCommit={(v) => commitEdit(row.rowId, column.key, v)}
          onCancel={cancelEdit}
        />
      ) : (
        <span className="sft-td__content">{content}</span>
      )}
    </div>
  );
}

interface CellEditorProps {
  initial: unknown;
  type: ResolvedReactColumn<unknown>['type'];
  onCommit: (value: unknown) => void;
  onCancel: () => void;
}

function CellEditor({ initial, type, onCommit, onCancel }: CellEditorProps): ReactNode {
  const [text, setText] = useState(initial == null ? '' : String(initial));
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => onCommit(type === 'number' && text !== '' ? Number(text) : text);

  return (
    <input
      ref={ref}
      className="sft-td__editor"
      type={type === 'number' ? 'number' : 'text'}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

export function cellStyle<T>(column: ResolvedReactColumn<T>, scrollX = false): React.CSSProperties {
  const { width, minWidth, maxWidth, flex } = column;

  // flexible column: grows to absorb leftover space (fills the container)
  if (flex && flex > 0) {
    return { flex: `${flex} 1 ${width ?? 0}px`, minWidth: minWidth ?? 0, maxWidth };
  }
  // fixed column — rigid in scroll mode, shrink-to-fit in the default (no-scroll) mode
  if (width) {
    return scrollX
      ? { flex: `0 0 ${width}px`, width, minWidth: minWidth ?? width, maxWidth }
      : { flex: `0 1 ${width}px`, minWidth: minWidth ?? 64, maxWidth };
  }
  // width-less column behaves as flex:1 (legacy default)
  return { flex: '1 1 0', minWidth: minWidth ?? 80, maxWidth };
}
