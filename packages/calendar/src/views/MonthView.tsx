import { Plus, Repeat } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, PreviewEvent } from '../types';
import { withAlpha } from '../utils/color';
import { dayNames, getDaysInMonth, isCurrentMonth, isSameDay, isToday } from '../utils/date';
import { expandRecurringEvents } from '../utils/events';

export interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: string;
  selectedEvent: CalendarEvent | null;
  previewEvent: PreviewEvent | null;
  expandedRows: Set<number>;
  setExpandedRows: (updater: (prev: Set<number>) => Set<number>) => void;
  onEventClick: (event: CalendarEvent, element?: HTMLElement) => void;
  /** open the create modal for a single day (the "+ new" hover button) */
  onAddEventClick: (date: Date, x?: number, y?: number) => void;
  /** open the create modal for a dragged multi-day range */
  onRangeSelect: (start: Date, end: Date, x: number, y: number) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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
  selectedEvent,
  previewEvent,
  expandedRows,
  setExpandedRows,
  onEventClick,
  onAddEventClick,
  onRangeSelect,
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
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [dragging, dragStart, dragEnd, onRangeSelect]);

  const inDragRange = (date: Date) => {
    if (!dragStart || !dragEnd) return false;
    const [s, e] = dragStart <= dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart];
    const t = startOfDay(date).getTime();
    return t >= startOfDay(s).getTime() && t <= startOfDay(e).getTime();
  };

  // spanning (multi-day) events + optional period preview, lane-packed
  const spanning = expanded
    .filter((e) => e.endDate)
    .map((e) => ({ id: e.id, start: e.date, end: e.endDate as Date }));
  if (previewEvent?.isPeriod && previewEvent.startDate && previewEvent.endDate) {
    spanning.push({ id: 'preview-temp', start: previewEvent.startDate, end: previewEvent.endDate });
  }
  const layers = assignLayers(spanning);
  const maxLayer = layers.size ? Math.max(...layers.values()) : -1;
  const periodEventsHeight = (maxLayer + 1) * 22;

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

      <div className="sft-cal-month__grid" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
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
          const displaySingles = singles.slice(0, maxSingles);
          const remaining = singles.length - displaySingles.length;

          const dateNumCls = !isCurrentMonth(date, currentDate)
            ? 'sft-cal-month__num sft-cal-month__num--dim'
            : isToday(date)
              ? 'sft-cal-month__num sft-cal-month__num--today'
              : dow === 0
                ? 'sft-cal-month__num sft-cal-sun'
                : dow === 6
                  ? 'sft-cal-month__num sft-cal-sat'
                  : 'sft-cal-month__num';

          return (
            <div
              key={date.toISOString()}
              className="sft-cal-month__cell"
              data-weekend={isWeekend || undefined}
              data-dragrange={inDragRange(date) || undefined}
              data-lastrow={index >= days.length - 7 || undefined}
              data-lastcol={index % 7 === 6 || undefined}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('[data-event="true"],button')) return;
                dragXY.current = { x: e.clientX, y: e.clientY };
                setDragging(true);
                setDragStart(date);
                setDragEnd(date);
              }}
              onMouseEnter={() => {
                if (dragging) setDragEnd(date);
              }}
            >
              <div className="sft-cal-month__cellhead">
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
                  return (
                    <div
                      key={event.id}
                      data-event="true"
                      className="sft-cal-month__bar"
                      style={{
                        top: `${layer * 22}px`,
                        background: withAlpha(color, 0.1),
                        borderTopLeftRadius: roundLeft ? 4 : 0,
                        borderBottomLeftRadius: roundLeft ? 4 : 0,
                        borderTopRightRadius: roundRight ? 4 : 0,
                        borderBottomRightRadius: roundRight ? 4 : 0,
                        paddingLeft: roundLeft ? 8 : 4,
                        paddingRight: roundRight ? 8 : 4,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event, e.currentTarget);
                      }}
                    >
                      {(isStart || firstOfWeek) && (
                        <span className="sft-cal-month__bar-title" style={{ color }}>
                          {event.recurrence && <Repeat size={11} />}
                          {event.title || pick(language, '(제목 없음)', '(No title)')}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* single-day chips */}
                {displaySingles.map((event, i) => {
                  const color =
                    categories.find((c) => c.id === event.categoryId)?.color || '#E30000';
                  const isLast = i === displaySingles.length - 1;
                  return (
                    <div
                      key={event.id}
                      data-event="true"
                      className="sft-cal-month__chip"
                      style={{ marginTop: i === 0 ? periodEventsHeight : 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event, e.currentTarget);
                      }}
                    >
                      <span className="sft-cal-month__chip-bar" style={{ background: color }} />
                      <span className="sft-cal-month__chip-title">
                        {event.title || pick(language, '(제목 없음)', '(No title)')}
                      </span>
                      {isLast && remaining > 0 ? (
                        <button
                          type="button"
                          className="sft-cal-month__more"
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
                      ) : (
                        <>
                          {event.recurrence && (
                            <Repeat className="sft-cal-month__chip-icon" size={12} />
                          )}
                          {event.startTime && (
                            <span className="sft-cal-month__chip-time">
                              {formatTime(event.startTime, language)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

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
