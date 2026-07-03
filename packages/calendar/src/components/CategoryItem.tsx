import { Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type DragEvent, useEffect, useRef, useState } from 'react';
import { pick } from '../i18n';
import type { Category } from '../types';

export interface CategoryItemProps {
  cat: Category;
  index: number;
  checked: boolean;
  language: string;
  colorPalette: string[];
  /** whether this row is in inline-edit mode */
  editing: boolean;
  onToggle: (id: string) => void;
  onEditStart: (cat: Category) => void;
  onEditCommit: (id: string, data: { name: string; color: string }) => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
  /** native drag reorder wiring */
  onDragStartRow: (index: number) => void;
  onDragEnterRow: (index: number) => void;
  onDropRow: () => void;
}

/**
 * CategoryItem — one row in the category list: a color-dot checkbox + name, a
 * hover "⋯" menu (edit / delete), an inline edit mode with a color-swatch
 * popover, and native drag-to-reorder. Ported from calendary's
 * DraggableCategoryItem (Google-calendar branches dropped).
 */
export function CategoryItem({
  cat,
  index,
  checked,
  language,
  colorPalette,
  editing,
  onToggle,
  onEditStart,
  onEditCommit,
  onEditCancel,
  onDelete,
  onDragStartRow,
  onDragEnterRow,
  onDropRow,
}: CategoryItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editName, setEditName] = useState(cat.name);
  const [editColor, setEditColor] = useState(cat.color);
  const [colorOpen, setColorOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // seed the draft whenever we (re)enter edit mode
  useEffect(() => {
    if (editing) {
      setEditName(cat.name);
      setEditColor(cat.color);
      setColorOpen(false);
    }
  }, [editing, cat.name, cat.color]);

  // close the row menu on any outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (editing) {
    return (
      <div className="sft-cal-catrow sft-cal-catrow--editing" ref={rootRef}>
        <div className="sft-cal-catrow__colorwrap">
          <button
            type="button"
            className="sft-cal-catrow__swatch"
            style={{ background: editColor, borderColor: editColor }}
            onClick={() => setColorOpen((v) => !v)}
            aria-label="pick color"
          />
          {colorOpen && (
            <div className="sft-cal-colorgrid">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="sft-cal-colorgrid__swatch"
                  data-active={editColor === c || undefined}
                  style={{ background: c }}
                  onClick={() => {
                    setEditColor(c);
                    setColorOpen(false);
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          )}
        </div>
        <input
          className="sft-cal-catrow__name-input"
          value={editName}
          // biome-ignore lint/a11y/noAutofocus: focus the inline category-rename field on open
          autoFocus
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editName.trim())
              onEditCommit(cat.id, { name: editName.trim(), color: editColor });
            else if (e.key === 'Escape') onEditCancel();
          }}
        />
        <button
          type="button"
          className="sft-cal-btn sft-cal-btn--primary sft-cal-btn--sm"
          disabled={!editName.trim()}
          onClick={() => onEditCommit(cat.id, { name: editName.trim(), color: editColor })}
        >
          {pick(language, '저장', 'Save')}
        </button>
      </div>
    );
  }

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStartRow(index);
  };
  const onDragEnter = () => onDragEnterRow(index);

  return (
    <div
      className="sft-cal-catrow"
      ref={rootRef}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropRow}
      onDragEnd={onDropRow}
    >
      <button type="button" className="sft-cal-catrow__main" onClick={() => onToggle(cat.id)}>
        <span
          className="sft-cal-catrow__dot"
          data-checked={checked || undefined}
          style={{ background: cat.color, borderColor: cat.color }}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="sft-cal-catrow__name">{cat.name}</span>
      </button>

      <div className="sft-cal-catrow__menu">
        <button
          type="button"
          className="sft-cal-catrow__menu-trigger"
          aria-label="category menu"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="sft-cal-menu">
            <button
              type="button"
              className="sft-cal-menu__item"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onEditStart(cat);
              }}
            >
              <Pencil size={14} />
              {pick(language, '편집', 'Edit')}
            </button>
            <button
              type="button"
              className="sft-cal-menu__item sft-cal-menu__item--danger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(cat.id);
              }}
            >
              <Trash2 size={14} />
              {pick(language, '삭제', 'Delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
