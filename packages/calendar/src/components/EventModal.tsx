import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, Recurrence, RecurrenceFreq } from '../types';
import { COLOR_PRESETS } from '../utils/color';
import { formatDate, isSameDay } from '../utils/date';
import { CategoryItem } from './CategoryItem';
import { DeleteOptionsDialog, type DeleteType } from './DeleteOptionsDialog';
import { type RecurrenceEndType, RecurrenceSection } from './RecurrenceSection';

export interface EventSaveData {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  categoryId: string;
  startDate: Date;
  endDate?: Date;
  recurrence?: Recurrence;
}

export interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** the event being edited, or null when creating */
  event?: CalendarEvent | null;
  selectedDate: Date | null;
  selectedEndDate?: Date | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
  categories: Category[];
  selectedCategoryIds: string[];
  language: string;
  onSave: (data: EventSaveData) => void;
  onDelete?: (deleteType: DeleteType) => void;
  /** live preview callback (drives the ghost chip in the views) */
  onChange?: (data: EventSaveData | null) => void;
  onToggleCategory: (id: string) => void;
  onAddCategory: (data: { name: string; color: string }) => string;
  onUpdateCategory: (id: string, data: { name: string; color: string }) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (from: number, to: number) => void;
}

const toDateInput = (d: Date | undefined) => (d ? formatDate(d) : '');
const fromDateInput = (v: string): Date | undefined => {
  if (!v) return undefined;
  const parts = v.split('-').map(Number);
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
};

const timeToMinutes = (t: string) => {
  const parts = t.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
};
const minutesToTime = (mins: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** editor weekday (Mon=0…Sun=6) for a JS Date */
const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;

/**
 * EventModal — the create/edit event dialog. Ported from calendary's
 * EventCreatePopover into a centered token-CSS modal: title, start/end date,
 * start/end time (duration-preserving), a category picker with inline add/edit,
 * a description field, and a recurrence editor. Save / Cancel / Delete footer;
 * deleting a recurring event opens the scope picker.
 */
export function EventModal({
  open,
  onOpenChange,
  event,
  selectedDate,
  selectedEndDate,
  defaultStartTime = '09:00',
  defaultEndTime = '10:00',
  categories,
  selectedCategoryIds,
  language,
  onSave,
  onDelete,
  onChange,
  onToggleCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [titleFocused, setTitleFocused] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  // recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq>('WEEKLY');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);
  const [recurrenceCount, setRecurrenceCount] = useState<string | number>(10);

  // category add/edit
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PRESETS[0] as string);
  const [addColorOpen, setAddColorOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // delete
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>('this');

  const dragIndexRef = useRef<number | null>(null);
  const prevStartRef = useRef(startTime);

  const isEdit = !!event;
  const isPeriod = useMemo(
    () => !!startDate && !!endDate && !isSameDay(startDate, endDate),
    [startDate, endDate],
  );

  // seed the form each time the modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-seeds only when `open` flips
  useEffect(() => {
    if (!open) return;
    setShowDeleteOptions(false);
    setShowAddCategory(false);
    setEditingCategoryId(null);
    if (event) {
      setTitle(event.title ?? '');
      setStartTime(event.startTime ?? defaultStartTime);
      setEndTime(event.endTime ?? defaultEndTime);
      setDescription(event.description ?? '');
      setCategoryId(event.categoryId ?? categories[0]?.id ?? '');
      setStartDate(event.date);
      setEndDate(event.endDate ?? event.date);
      setShowDescription(!!event.description);
      const rec = event.recurrence;
      setIsRecurring(!!rec);
      if (rec) {
        setRecurrenceFreq(rec.freq);
        setSelectedWeekdays(rec.byweekday ?? []);
        setRecurrenceEndType(rec.until ? 'date' : rec.count ? 'count' : 'never');
        setRecurrenceEndDate(rec.until);
        setRecurrenceCount(rec.count ?? 10);
      } else {
        setSelectedWeekdays([]);
        setRecurrenceEndType('never');
      }
    } else {
      const s = selectedDate ?? new Date();
      setTitle('');
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
      setDescription('');
      setCategoryId(categories[0]?.id ?? '');
      setStartDate(s);
      setEndDate(selectedEndDate ?? s);
      setShowDescription(false);
      setIsRecurring(false);
      setSelectedWeekdays([]);
      setRecurrenceEndType('never');
      setRecurrenceCount(10);
    }
    prevStartRef.current = event?.startTime ?? defaultStartTime;
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const buildRecurrence = (): Recurrence | undefined => {
    if (!isRecurring) return undefined;
    const rec: Recurrence = { freq: recurrenceFreq, interval: 1 };
    if (recurrenceFreq === 'WEEKLY' && selectedWeekdays.length > 0)
      rec.byweekday = selectedWeekdays;
    if (recurrenceEndType === 'date' && recurrenceEndDate) rec.until = recurrenceEndDate;
    if (recurrenceEndType === 'count') rec.count = Number(recurrenceCount) || 1;
    return rec;
  };

  // live preview — recompute only when a form field actually changes, so we
  // don't feed back into the parent's re-render (which would loop)
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are the form fields; buildRecurrence is derived from them
  useEffect(() => {
    if (!open || !onChange || !startDate) return;
    onChange({
      title,
      startTime,
      endTime,
      description,
      categoryId,
      startDate,
      endDate: isPeriod ? endDate : undefined,
      recurrence: buildRecurrence(),
    });
  }, [
    open,
    title,
    startTime,
    endTime,
    description,
    categoryId,
    startDate,
    endDate,
    isPeriod,
    isRecurring,
    recurrenceFreq,
    selectedWeekdays,
    recurrenceEndType,
    recurrenceEndDate,
    recurrenceCount,
  ]);

  const canSave = title.trim().length > 0 && !!startDate;

  const handleSave = () => {
    if (!canSave || !startDate) return;
    onSave({
      title: title.trim(),
      startTime,
      endTime,
      description,
      categoryId,
      startDate,
      endDate: isPeriod ? endDate : undefined,
      recurrence: buildRecurrence(),
    });
    onOpenChange(false);
  };

  const handleStartTimeChange = (v: string) => {
    // preserve duration by shifting the end time
    const duration = timeToMinutes(endTime) - timeToMinutes(prevStartRef.current);
    setStartTime(v);
    if (duration > 0) {
      const nextEnd = minutesToTime(timeToMinutes(v) + duration);
      if (timeToMinutes(nextEnd) >= timeToMinutes(v)) setEndTime(nextEnd);
    }
    prevStartRef.current = v;
  };

  const handleEndTimeChange = (v: string) => {
    if (timeToMinutes(v) < timeToMinutes(startTime)) return;
    setEndTime(v);
  };

  const toggleRecurring = (on: boolean) => {
    setIsRecurring(on);
    if (on && recurrenceFreq === 'WEEKLY' && selectedWeekdays.length === 0 && startDate) {
      setSelectedWeekdays([weekdayOf(startDate)]);
    }
  };

  const handleDelete = () => {
    if (event?.recurrence) setShowDeleteOptions(true);
    else onDelete?.('all');
  };

  const usedColors = new Set(categories.map((c) => c.color));
  const nextColor = COLOR_PRESETS.find((c) => !usedColors.has(c)) ?? (COLOR_PRESETS[0] as string);

  if (!open) return null;

  return (
    <div className="sft-cal-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="sft-cal-modal" role="dialog" aria-modal="true">
        {/* title */}
        <div className="sft-cal-modal__titlewrap">
          <input
            className="sft-cal-modal__title"
            value={title}
            placeholder={pick(language, '새 일정', 'New event')}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSave();
            }}
          />
          <button
            type="button"
            className="sft-cal-modal__close"
            aria-label="close"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} />
          </button>
          <span className="sft-cal-modal__underline" data-active={titleFocused || undefined} />
        </div>

        {/* repeat toggle */}
        <label className="sft-cal-modal__repeat">
          <span>{pick(language, '반복', 'Repeat')}</span>
          <input
            type="checkbox"
            className="sft-cal-switch"
            checked={isRecurring}
            onChange={(e) => toggleRecurring(e.target.checked)}
          />
        </label>

        {isRecurring && (
          <RecurrenceSection
            language={language}
            recurrenceFreq={recurrenceFreq}
            setRecurrenceFreq={setRecurrenceFreq}
            selectedWeekdays={selectedWeekdays}
            setSelectedWeekdays={setSelectedWeekdays}
            recurrenceEndType={recurrenceEndType}
            setRecurrenceEndType={setRecurrenceEndType}
            recurrenceCount={recurrenceCount}
            setRecurrenceCount={setRecurrenceCount}
            recurrenceEndDate={recurrenceEndDate}
            setRecurrenceEndDate={setRecurrenceEndDate}
            internalStartDate={startDate}
          />
        )}

        {/* dates */}
        <div className="sft-cal-modal__grid2">
          <div className="sft-cal-field">
            <div className="sft-cal-label">{pick(language, '시작 날짜', 'Start date')}</div>
            <input
              type="date"
              className="sft-cal-input"
              value={toDateInput(startDate)}
              onChange={(e) => {
                const d = fromDateInput(e.target.value);
                setStartDate(d);
                if (d && (!endDate || endDate < d)) setEndDate(d);
              }}
            />
          </div>
          <div className="sft-cal-field">
            <div className="sft-cal-label">{pick(language, '종료 날짜', 'End date')}</div>
            {isRecurring && recurrenceEndType !== 'date' ? (
              <div className="sft-cal-input sft-cal-input--static">
                {pick(language, '종료일 없음', 'No end date')}
              </div>
            ) : isRecurring && recurrenceEndType === 'date' ? (
              <input
                type="date"
                className="sft-cal-input"
                value={toDateInput(recurrenceEndDate)}
                min={toDateInput(startDate)}
                onChange={(e) => setRecurrenceEndDate(fromDateInput(e.target.value))}
              />
            ) : (
              <input
                type="date"
                className="sft-cal-input"
                value={toDateInput(endDate)}
                min={toDateInput(startDate)}
                onChange={(e) => setEndDate(fromDateInput(e.target.value))}
              />
            )}
          </div>
        </div>

        {/* times */}
        <div className="sft-cal-modal__grid2">
          <div className="sft-cal-field">
            <div className="sft-cal-label">{pick(language, '시작 시간', 'Start time')}</div>
            <input
              type="time"
              className="sft-cal-input"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
          </div>
          <div className="sft-cal-field">
            <div className="sft-cal-label">{pick(language, '종료 시간', 'End time')}</div>
            <input
              type="time"
              className="sft-cal-input"
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
            />
          </div>
        </div>

        {/* category */}
        <div className="sft-cal-modal__category">
          <div className="sft-cal-modal__cathead">
            <div className="sft-cal-label">{pick(language, '카테고리', 'Category')}</div>
          </div>
          <div className="sft-cal-modal__catlist">
            {categories.map((cat, index) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                index={index}
                checked={cat.id === categoryId}
                language={language}
                colorPalette={COLOR_PRESETS}
                editing={editingCategoryId === cat.id}
                onToggle={(id) => setCategoryId(id)}
                onEditStart={(c) => setEditingCategoryId(c.id)}
                onEditCommit={(id, data) => {
                  onUpdateCategory(id, data);
                  setEditingCategoryId(null);
                }}
                onEditCancel={() => setEditingCategoryId(null)}
                onDelete={(id) => {
                  onDeleteCategory(id);
                  if (categoryId === id)
                    setCategoryId(categories.find((c) => c.id !== id)?.id ?? '');
                }}
                onDragStartRow={(i) => {
                  dragIndexRef.current = i;
                }}
                onDragEnterRow={(i) => {
                  const from = dragIndexRef.current;
                  if (from != null && from !== i) {
                    onReorderCategories(from, i);
                    dragIndexRef.current = i;
                  }
                }}
                onDropRow={() => {
                  dragIndexRef.current = null;
                }}
              />
            ))}
          </div>

          {showAddCategory ? (
            <div className="sft-cal-catrow sft-cal-catrow--editing">
              <div className="sft-cal-catrow__colorwrap">
                <button
                  type="button"
                  className="sft-cal-catrow__swatch"
                  style={{ background: newCategoryColor, borderColor: newCategoryColor }}
                  onClick={() => setAddColorOpen((v) => !v)}
                  aria-label="pick color"
                />
                {addColorOpen && (
                  <div className="sft-cal-colorgrid">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="sft-cal-colorgrid__swatch"
                        data-active={newCategoryColor === c || undefined}
                        style={{ background: c }}
                        onClick={() => {
                          setNewCategoryColor(c);
                          setAddColorOpen(false);
                        }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                )}
              </div>
              <input
                className="sft-cal-catrow__name-input"
                // biome-ignore lint/a11y/noAutofocus: focus the freshly-opened inline add-category input
                autoFocus
                placeholder={pick(language, '카테고리 이름', 'Category name')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    const id = onAddCategory({
                      name: newCategoryName.trim(),
                      color: newCategoryColor,
                    });
                    setCategoryId(id);
                    setShowAddCategory(false);
                    setNewCategoryName('');
                  } else if (e.key === 'Escape') {
                    setShowAddCategory(false);
                  }
                }}
              />
              <button
                type="button"
                className="sft-cal-btn sft-cal-btn--primary sft-cal-btn--sm"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  const id = onAddCategory({
                    name: newCategoryName.trim(),
                    color: newCategoryColor,
                  });
                  setCategoryId(id);
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
              >
                {pick(language, '저장', 'Save')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sft-cal-modal__ghostrow"
              onClick={() => {
                setNewCategoryColor(nextColor);
                setNewCategoryName('');
                setShowAddCategory(true);
              }}
            >
              <Plus size={14} />
              {pick(language, '새 카테고리', 'New category')}
            </button>
          )}
        </div>

        <div className="sft-cal-modal__divider" />

        {/* description */}
        {showDescription ? (
          <div className="sft-cal-field">
            <div className="sft-cal-modal__cathead">
              <div className="sft-cal-label">{pick(language, '설명', 'Description')}</div>
              <button
                type="button"
                className="sft-cal-modal__collapse"
                onClick={() => {
                  setShowDescription(false);
                  setDescription('');
                }}
              >
                <Minus size={14} />
                {pick(language, '접기', 'Collapse')}
              </button>
            </div>
            <textarea
              className="sft-cal-textarea"
              rows={2}
              // biome-ignore lint/a11y/noAutofocus: focus the freshly-revealed description field
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="sft-cal-modal__ghostrow"
            onClick={() => setShowDescription(true)}
          >
            <Plus size={14} />
            {pick(language, '설명 추가', 'Add description')}
          </button>
        )}

        {/* footer */}
        <div className="sft-cal-modal__actions">
          <button
            type="button"
            className="sft-cal-btn sft-cal-btn--outline sft-cal-btn--block"
            onClick={() => onOpenChange(false)}
          >
            {pick(language, '취소', 'Cancel')}
          </button>
          <button
            type="button"
            className="sft-cal-btn sft-cal-btn--primary sft-cal-btn--block"
            disabled={!canSave}
            onClick={handleSave}
          >
            {isEdit ? pick(language, '수정', 'Update') : pick(language, '추가', 'Add')}
          </button>
          {isEdit && onDelete && (
            <button
              type="button"
              className="sft-cal-btn sft-cal-btn--outline sft-cal-btn--icon"
              aria-label={pick(language, '삭제', 'Delete')}
              onClick={handleDelete}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {showDeleteOptions && (
        <DeleteOptionsDialog
          language={language}
          selectedDeleteType={deleteType}
          setSelectedDeleteType={setDeleteType}
          onCancel={() => setShowDeleteOptions(false)}
          onDelete={() => {
            onDelete?.(deleteType);
            setShowDeleteOptions(false);
            onOpenChange(false);
          }}
        />
      )}
    </div>
  );
}
