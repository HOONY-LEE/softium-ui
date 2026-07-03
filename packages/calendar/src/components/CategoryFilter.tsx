import { ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { pick } from '../i18n';
import type { Category } from '../types';
import { COLOR_PRESETS } from '../utils/color';
import { CategoryItem } from './CategoryItem';

export interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryIds: string[];
  language: string;
  onToggle: (id: string) => void;
  onAdd: (data: { name: string; color: string }) => string;
  onUpdate: (id: string, data: { name: string; color: string }) => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

/**
 * CategoryFilter — the header's "N selected" popover: the multi-select category
 * list (drag-reorderable) plus an inline add row. Ported from calendary's
 * category dropdown.
 */
export function CategoryFilter({
  categories,
  selectedCategoryIds,
  language,
  onToggle,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0] as string);
  const [colorOpen, setColorOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const allSelected = selectedCategoryIds.length === categories.length;
  const label = allSelected
    ? pick(language, '전체 카테고리', 'All categories')
    : pick(
        language,
        `${selectedCategoryIds.length}개 선택됨`,
        `${selectedCategoryIds.length} selected`,
      );

  const usedColors = new Set(categories.map((c) => c.color));
  const nextColor = COLOR_PRESETS.find((c) => !usedColors.has(c)) ?? (COLOR_PRESETS[0] as string);

  const commitAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), color });
    setShowAdd(false);
    setName('');
  };

  return (
    <div className="sft-cal-catfilter" ref={rootRef}>
      <button
        type="button"
        className="sft-cal-catfilter__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="sft-cal-catfilter__popover">
          <div className="sft-cal-catfilter__list">
            {categories.map((cat, index) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                index={index}
                checked={selectedCategoryIds.includes(cat.id)}
                language={language}
                colorPalette={COLOR_PRESETS}
                editing={editingId === cat.id}
                onToggle={onToggle}
                onEditStart={(c) => setEditingId(c.id)}
                onEditCommit={(id, data) => {
                  onUpdate(id, data);
                  setEditingId(null);
                }}
                onEditCancel={() => setEditingId(null)}
                onDelete={onDelete}
                onDragStartRow={(i) => {
                  dragIndexRef.current = i;
                }}
                onDragEnterRow={(i) => {
                  const from = dragIndexRef.current;
                  if (from != null && from !== i) {
                    onReorder(from, i);
                    dragIndexRef.current = i;
                  }
                }}
                onDropRow={() => {
                  dragIndexRef.current = null;
                }}
              />
            ))}
          </div>

          <div className="sft-cal-modal__divider" />

          {showAdd ? (
            <div className="sft-cal-catrow sft-cal-catrow--editing">
              <div className="sft-cal-catrow__colorwrap">
                <button
                  type="button"
                  className="sft-cal-catrow__swatch"
                  style={{ background: color, borderColor: color }}
                  onClick={() => setColorOpen((v) => !v)}
                  aria-label="pick color"
                />
                {colorOpen && (
                  <div className="sft-cal-colorgrid">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="sft-cal-colorgrid__swatch"
                        data-active={color === c || undefined}
                        style={{ background: c }}
                        onClick={() => {
                          setColor(c);
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
                // biome-ignore lint/a11y/noAutofocus: focus the inline add-category input on open
                autoFocus
                placeholder={pick(language, '카테고리 이름', 'Category name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd();
                  else if (e.key === 'Escape') setShowAdd(false);
                }}
              />
              <button
                type="button"
                className="sft-cal-btn sft-cal-btn--primary sft-cal-btn--sm"
                disabled={!name.trim()}
                onClick={commitAdd}
              >
                {pick(language, '저장', 'Save')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sft-cal-modal__ghostrow"
              onClick={() => {
                setColor(nextColor);
                setName('');
                setShowAdd(true);
              }}
            >
              <Plus size={14} />
              {pick(language, '새 카테고리', 'New category')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
