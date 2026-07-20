import { Plus, Repeat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, Holiday, PreviewEvent } from '../types';
import { withAlpha } from '../utils/color';
import { dayNames, getDaysInMonth, isCurrentMonth, isSameDay, isToday } from '../utils/date';
import { expandRecurringEvents } from '../utils/events';

export interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: string;
  /** holidays/observances shown as a label next to the date number */
  holidays?: Holiday[];
  selectedEvent: CalendarEvent | null;
  previewEvent: PreviewEvent | null;
  expandedRows: Set<number>;
  setExpandedRows: (updater: (prev: Set<number>) => Set<number>) => void;
  onEventClick: (event: CalendarEvent, element?: HTMLElement) => void;
  /** open the create modal for a single day (the "+ new" hover button) */
  onAddEventClick: (date: Date, x?: number, y?: number) => void;
  /** open the create modal for a dragged multi-day range */
  onRangeSelect: (start: Date, end: Date, x: number, y: number) => void;
  /** drag an event chip/bar onto another day to move it — for a recurring
   * event, the host is expected to resolve a "this/following/all" scope
   * (e.g. via a dialog) before actually committing the move */
  onEventMove: (event: CalendarEvent, newDate: Date) => void;
  /** drag a non-recurring period bar's start/end edge onto another day to resize it */
  onEventResize: (event: CalendarEvent, edge: 'start' | 'end', newDate: Date) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// every item inside a cell (date head, period bar, day chip, "+N more",
// "+ new event") is one row of this height; ROW adds the 1px inter-row gap so
// the absolutely-positioned period bars line up with the flex-stacked chips.
// Keep in sync with --sft-cal-event-h in calendar.css.
const EVENT_H = 22;
const ROW = EVENT_H + 1;

/** greedy lane packing so overlapping multi-day bars stack without colliding */
function assignLayers(spanning: { id: string; start: Date; end: Date }[]): Map<string, number> {
  const layers = new Map<string, number>();
  const laneEnds: Date[] = []; // last end date occupying each lane
  const sorted = [...spanning].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const ev of sorted) {
    let lane = 0;
    while (lane < laneEnds.length && (laneEnds[lane] as Date) >= startOfDay(ev.start)) lane++;
    laneEnds[lane] = startOfDay(ev.end);
    layers.set(ev.id, lane);
  }
  return layers;
}

/** localized "N시" period-clock time, e.g. 오후 2시 / 2 PM */
function formatTime(time: string, language: string): string {
  const h = Number(time.split(':')[0]) || 0;
  const period = h < 12 ? pick(language, '오전', 'AM') : pick(language, '오후', 'PM');
  const display = h % 12 === 0 ? 12 : h % 12;
  return pick(language, `${period} ${display}시`, `${display} ${period}`);
}

export function MonthView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  holidays = [],
  selectedEvent,
  previewEvent,
  expandedRows,
  setExpandedRows,
  onEventClick,
  onAddEventClick,
  onRangeSelect,
  onEventMove,
  onEventResize,
}: MonthViewProps) {
  const { days, rows } = getDaysInMonth(currentDate);
  const maxEventsToShow = rows === 4 ? 8 : rows === 5 ? 6 : 5;

  const rangeStart = startOfDay(days[0] as Date);
  const rangeEnd = startOfDay(days[days.length - 1] as Date);
  const expanded = expandRecurringEvents(events, rangeStart, rangeEnd).filter(
    (e) => !e.categoryId || selectedCategoryIds.includes(e.categoryId),
  );

  // drag-to-create range selection (internal)
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragXY = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragging) return;
    const onUp = () => {
      setDragging(false);
      if (dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) {
        const [s, e] = dragStart <= dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart];
        onRangeSelect(s, e, dragXY.current.x, dragXY.current.y);
      }
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragging, dragStart, dragEnd, onRangeSelect]);

  // drag an existing (non-recurring) event chip/bar onto another day to move
  // it, or drag a period bar's start/end edge to resize it. A mousedown on
  // the item just arms the drag; it only "counts" once the pointer actually
  // moves, so a plain click still opens the edit modal.
  type MoveMode = 'move' | 'resize-start' | 'resize-end';
  const moveRef = useRef<{
    event: CalendarEvent;
    mode: MoveMode;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const justMovedRef = useRef(false);
  const [moveTargetDate, setMoveTargetDate] = useState<Date | null>(null);
  // mirrors moveTargetDate, read (not written) in onUp — a functional setState
  // updater runs twice under StrictMode, so the onEventMove/onEventResize side
  // effect must live outside of one (see CALENDAR_TASKS.md's C1-b note)
  const moveTargetDateRef = useRef<Date | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const m = moveRef.current;
      if (!m || m.moved) return;
      if (Math.abs(e.clientX - m.startX) > 4 || Math.abs(e.clientY - m.startY) > 4) m.moved = true;
    }
    function onUp() {
      const m = moveRef.current;
      if (m?.moved) {
        const target = moveTargetDateRef.current;
        if (target) {
          justMovedRef.current = true;
          if (m.mode === 'move') onEventMove(m.event, target);
          else onEventResize(m.event, m.mode === 'resize-start' ? 'start' : 'end', target);
        }
      }
      moveRef.current = null;
      moveTargetDateRef.current = null;
      setMoveTargetDate(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onEventMove, onEventResize]);

  const startEventMove = (e: React.PointerEvent, event: CalendarEvent, mode: MoveMode = 'move') => {
    // the drag tracks the hovered day via cell onMouseEnter, which fires for
    // mouse/pen but not touch (touch implicitly captures the pointer), so
    // chip/bar drag-move + resize stay a mouse/pen affordance — on touch a tap
    // still opens the event (click) or the "+" button creates one
    if (e.pointerType === 'touch') return;
    // recurring events can be moved (the host decides "this/following/all"
    // via a scope dialog, see onEventMove) but not resized — a resize only
    // makes sense against a single occurrence's concrete date range
    if ((event.recurrence || event.isRecurringInstance) && mode !== 'move') return;
    e.stopPropagation();
    moveRef.current = { event, mode, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const handleEventItemClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (justMovedRef.current) {
      justMovedRef.current = false;
      return;
    }
    onEventClick(event, e.currentTarget as HTMLElement);
  };

  // keyboard navigation: one roving-tabindex cell, arrow keys move it,
  // Enter/Space opens the create modal for the focused day
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (focusedIndex == null) return;
    cellRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const base = focusedIndex ?? days.findIndex((d) => isToday(d)) ?? 0;
    let next = base;
    if (e.key === 'ArrowRight') next = base + 1;
    else if (e.key === 'ArrowLeft') next = base - 1;
    else if (e.key === 'ArrowDown') next = base + 7;
    else if (e.key === 'ArrowUp') next = base - 7;
    else if (e.key === 'Enter' || e.key === ' ') {
      const d = days[base];
      if (d) onAddEventClick(d);
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    setFocusedIndex(Math.max(0, Math.min(days.length - 1, next)));
  };

  // a multi-day drag renders as a single "+ 새 일정" bar that grows across the
  // dragged days (Google-Calendar style) — not a whole-cell background tint
  const dragPreview =
    dragging && dragStart && dragEnd && !isSameDay(dragStart, dragEnd)
      ? dragStart <= dragEnd
        ? { start: dragStart, end: dragEnd }
        : { start: dragEnd, end: dragStart }
      : null;

  const inRange = (date: Date, s: Date, e: Date) => {
    const t = startOfDay(date).getTime();
    return t >= startOfDay(s).getTime() && t <= startOfDay(e).getTime();
  };

  // spanning (multi-day) events + optional period / drag previews, lane-packed
  const spanning = expanded
    .filter((e) => e.endDate)
    .map((e) => ({ id: e.id, start: e.date, end: e.endDate as Date }));
  if (previewEvent?.isPeriod && previewEvent.startDate && previewEvent.endDate) {
    spanning.push({ id: 'preview-temp', start: previewEvent.startDate, end: previewEvent.endDate });
  }
  if (dragPreview) {
    spanning.push({ id: 'drag-temp', start: dragPreview.start, end: dragPreview.end });
  }
  const layers = assignLayers(spanning);
  const maxLayer = layers.size ? Math.max(...layers.values()) : -1;
  const periodEventsHeight = (maxLayer + 1) * ROW;

  return (
    <div className="sft-cal-month">
      <div className="sft-cal-month__weekdays">
        {(dayNames[language] ?? dayNames.en ?? []).map((label, i) => (
          <div
            key={label}
            className={`sft-cal-month__weekday${i === 0 ? ' sft-cal-sun' : i === 6 ? ' sft-cal-sat' : ''}`}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="sft-cal-month__grid"
        style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}
        role="grid"
        aria-label={pick(language, '월간 캘린더', 'Month calendar')}
        onKeyDown={handleGridKeyDown}
      >
        {days.map((date, index) => {
          const rowIndex = Math.floor(index / 7);
          const isWeekend = index % 7 === 0 || index % 7 === 6;
          const dow = date.getDay();
          const dayEvents = expanded.filter((e) => {
            const t = startOfDay(date).getTime();
            const s = startOfDay(e.date).getTime();
            const en = e.endDate ? startOfDay(e.endDate).getTime() : s;
            return t >= s && t <= en;
          });
          const singles = dayEvents.filter((e) => !e.endDate);
          const periodsForDay = dayEvents.filter((e) => e.endDate);

          const rowExpanded = expandedRows.has(rowIndex);
          const effectiveMax = rowExpanded ? dayEvents.length : maxEventsToShow;
          const maxSingles = Math.max(0, effectiveMax - periodsForDay.length);
          let displaySingles = singles.slice(0, maxSingles);
          let remaining = singles.length - displaySingles.length;
          // "+N more" is its own same-height row, so reserve a slot for it
          // when collapsed and some singles are hidden
          if (!rowExpanded && remaining > 0 && maxSingles > 0) {
            displaySingles = singles.slice(0, maxSingles - 1);
            remaining = singles.length - displaySingles.length;
          }

          const holiday = holidays.find((h) => isSameDay(h.date, date));
          const dateNumCls = !isCurrentMonth(date, currentDate)
            ? 'sft-cal-month__num sft-cal-month__num--dim'
            : isToday(date)
              ? 'sft-cal-month__num sft-cal-month__num--today'
              : dow === 0 || holiday
                ? 'sft-cal-month__num sft-cal-sun'
                : dow === 6
                  ? 'sft-cal-month__num sft-cal-sat'
                  : 'sft-cal-month__num';

          return (
            <div
              key={date.toISOString()}
              ref={(el) => {
                cellRefs.current[index] = el;
              }}
              className="sft-cal-month__cell"
              data-weekend={isWeekend || undefined}
              data-lastrow={index >= days.length - 7 || undefined}
              data-lastcol={index % 7 === 6 || undefined}
              data-movetarget={(moveTargetDate && isSameDay(moveTargetDate, date)) || undefined}
              role="gridcell"
              tabIndex={(focusedIndex ?? days.findIndex((d) => isToday(d)) ?? 0) === index ? 0 : -1}
              aria-label={`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}${holiday ? ` ${holiday.name}` : ''}`}
              aria-current={isToday(date) ? 'date' : undefined}
              onFocus={() => setFocusedIndex(index)}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('[data-event="true"],button')) return;
                // drag-to-create is a mouse/pen affordance (tracks the hovered
                // day via onMouseEnter); on touch the "+ 새 일정" button creates
                if (e.pointerType === 'touch') return;
                dragXY.current = { x: e.clientX, y: e.clientY };
                setDragging(true);
                setDragStart(date);
                setDragEnd(date);
              }}
              onMouseEnter={() => {
                if (dragging) setDragEnd(date);
                if (moveRef.current) {
                  moveTargetDateRef.current = date;
                  setMoveTargetDate(date);
                }
              }}
            >
              <div className="sft-cal-month__cellhead">
                {holiday && <span className="sft-cal-month__holiday">{holiday.name}</span>}
                <span className={dateNumCls}>{date.getDate()}</span>
              </div>

              <div className="sft-cal-month__events">
                {/* spanning bars covering this day */}
                {periodsForDay.map((event) => {
                  const layer = layers.get(event.id) ?? 0;
                  const color =
                    categories.find((c) => c.id === event.categoryId)?.color || '#E30000';
                  const isStart = isSameDay(event.date, date);
                  const isEnd = event.endDate ? isSameDay(event.endDate, date) : true;
                  const firstOfWeek = index % 7 === 0;
                  const lastOfWeek = index % 7 === 6;
                  const roundLeft = isStart || firstOfWeek;
                  const roundRight = isEnd || lastOfWeek;
                  // all events can be dragged to move (recurring goes through
                  // a scope dialog); only non-recurring can be resized, since
                  // a resize edits a single concrete date range
                  const resizable = !event.recurrence && !event.isRecurringInstance;
                  return (
                    <div
                      key={event.id}
                      data-event="true"
                      className="sft-cal-month__bar"
                      data-movable="true"
                      role="button"
                      tabIndex={isStart || firstOfWeek ? 0 : -1}
                      aria-label={event.title || pick(language, '(제목 없음)', '(No title)')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation(); // otherwise bubbles to the grid's own Enter handler
                          onEventClick(event, e.currentTarget);
                        }
                      }}
                      style={{
                        top: `${layer * ROW}px`,
                        background: withAlpha(color, 0.1),
                        borderTopLeftRadius: roundLeft ? 4 : 0,
                        borderBottomLeftRadius: roundLeft ? 4 : 0,
                        borderTopRightRadius: roundRight ? 4 : 0,
                        borderBottomRightRadius: roundRight ? 4 : 0,
                        paddingLeft: roundLeft ? 8 : 4,
                        paddingRight: roundRight ? 8 : 4,
                      }}
                      onPointerDown={(e) => startEventMove(e, event)}
                      onClick={(e) => handleEventItemClick(e, event)}
                    >
                      {/* left/right edges: only on the bar's actual start/end day
                          segment, so dragging them resizes the date range */}
                      {resizable && isStart && (
                        <span
                          className="sft-cal-month__bar-resize sft-cal-month__bar-resize--left"
                          onPointerDown={(e) => startEventMove(e, event, 'resize-start')}
                        />
                      )}
                      {(isStart || firstOfWeek) && (
                        <span className="sft-cal-month__bar-title" style={{ color }}>
                          {event.recurrence && <Repeat size={11} />}
                          {event.title || pick(language, '(제목 없음)', '(No title)')}
                        </span>
                      )}
                      {resizable && isEnd && (
                        <span
                          className="sft-cal-month__bar-resize sft-cal-month__bar-resize--right"
                          onPointerDown={(e) => startEventMove(e, event, 'resize-end')}
                        />
                      )}
                    </div>
                  );
                })}

                {/* multi-day drag: a single "+ 새 일정" bar that grows across
                    the dragged days, styled like the add button */}
                {dragPreview &&
                  inRange(date, dragPreview.start, dragPreview.end) &&
                  (() => {
                    const layer = layers.get('drag-temp') ?? 0;
                    const isStart = isSameDay(dragPreview.start, date);
                    const isEnd = isSameDay(dragPreview.end, date);
                    const firstOfWeek = index % 7 === 0;
                    const lastOfWeek = index % 7 === 6;
                    const roundLeft = isStart || firstOfWeek;
                    const roundRight = isEnd || lastOfWeek;
                    return (
                      <div
                        className="sft-cal-month__bar sft-cal-month__bar--drag"
                        style={{
                          top: `${layer * ROW}px`,
                          borderTopLeftRadius: roundLeft ? 4 : 0,
                          borderBottomLeftRadius: roundLeft ? 4 : 0,
                          borderTopRightRadius: roundRight ? 4 : 0,
                          borderBottomRightRadius: roundRight ? 4 : 0,
                          paddingLeft: roundLeft ? 8 : 4,
                          paddingRight: roundRight ? 8 : 4,
                        }}
                      >
                        {(isStart || firstOfWeek) && (
                          <span className="sft-cal-month__bar-title">
                            <Plus size={12} />
                            {pick(language, '새 일정', 'New event')}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                {/* single-day chips */}
                {displaySingles.map((event, i) => {
                  const color =
                    categories.find((c) => c.id === event.categoryId)?.color || '#E30000';
                  return (
                    <div
                      key={event.id}
                      data-event="true"
                      className="sft-cal-month__chip"
                      data-movable="true"
                      role="button"
                      tabIndex={0}
                      aria-label={event.title || pick(language, '(제목 없음)', '(No title)')}
                      style={{ marginTop: i === 0 ? periodEventsHeight : 1 }}
                      onPointerDown={(e) => startEventMove(e, event)}
                      onClick={(e) => handleEventItemClick(e, event)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation(); // otherwise bubbles to the grid's own Enter handler
                          onEventClick(event, e.currentTarget);
                        }
                      }}
                    >
                      <span className="sft-cal-month__chip-bar" style={{ background: color }} />
                      <span className="sft-cal-month__chip-title">
                        {event.title || pick(language, '(제목 없음)', '(No title)')}
                      </span>
                      {event.recurrence && (
                        <Repeat className="sft-cal-month__chip-icon" size={12} />
                      )}
                      {event.startTime && (
                        <span className="sft-cal-month__chip-time">
                          {formatTime(event.startTime, language)}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* "+N more" — its own same-height row, toggles the row open */}
                {remaining > 0 && (
                  <button
                    type="button"
                    className="sft-cal-month__more"
                    style={{ marginTop: displaySingles.length ? 1 : periodEventsHeight }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRows((prev) => {
                        const next = new Set(prev);
                        if (next.has(rowIndex)) next.delete(rowIndex);
                        else next.add(rowIndex);
                        return next;
                      });
                    }}
                  >
                    {pick(language, `+${remaining}개`, `+${remaining} more`)}
                  </button>
                )}

                {/* single preview chip */}
                {previewEvent &&
                  !previewEvent.isPeriod &&
                  isSameDay(previewEvent.startDate ?? currentDate, date) && (
                    <div
                      className="sft-cal-month__chip sft-cal-month__chip--preview"
                      style={{ marginTop: singles.length === 0 ? periodEventsHeight : 1 }}
                    >
                      <span
                        className="sft-cal-month__chip-bar"
                        style={{
                          background:
                            categories.find((c) => c.id === previewEvent.categoryId)?.color ||
                            '#000',
                        }}
                      />
                      <span className="sft-cal-month__chip-title">
                        {previewEvent.title || pick(language, '(제목 없음)', '(No title)')}
                      </span>
                      {previewEvent.startTime && (
                        <span className="sft-cal-month__chip-time">
                          {formatTime(previewEvent.startTime, language)}
                        </span>
                      )}
                    </div>
                  )}

                {/* hover "+ new event" button */}
                <button
                  type="button"
                  className="sft-cal-month__add"
                  style={{ marginTop: singles.length === 0 ? periodEventsHeight : 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEventClick(date, e.clientX, e.clientY);
                  }}
                >
                  <Plus size={14} />
                  {pick(language, '새 일정', 'New event')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
