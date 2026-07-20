import { Repeat } from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, PreviewEvent } from '../types';
import { withAlpha } from '../utils/color';
import {
  dayNames,
  getWeekDays,
  hhmmToMinutes,
  isSameDay,
  isToday,
  minutesFromY,
  minutesToHHMM,
  snapMinutes,
} from '../utils/date';
import { expandRecurringEvents } from '../utils/events';

export interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: string;
  selectedEvent: CalendarEvent | null;
  previewEvent: PreviewEvent | null;
  onEventClick: (event: CalendarEvent, element?: HTMLElement) => void;
  onAddEventClick: (date: Date, hour?: number, clientX?: number, clientY?: number) => void;
  /** drag an empty time-grid area (snapped to 15 min) to create a timed event */
  onTimeRangeSelect: (date: Date, startMin: number, endMin: number) => void;
  /** drag (any event) or resize (non-recurring only) to a new start/end
   * time; `newDate` is set only when a "move" drag also crossed into a
   * different day column. For a recurring event, the host is expected to
   * resolve a "this/following/all" scope before actually committing */
  onEventTimeChange: (
    event: CalendarEvent,
    startMin: number,
    endMin: number,
    newDate?: Date,
  ) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_EVENT_MINUTES = 15;

type MoveMode = 'move' | 'resize-start' | 'resize-end';

function dayColorClass(dayOfWeek: number): string | undefined {
  if (dayOfWeek === 0) return 'sft-cal-sun';
  if (dayOfWeek === 6) return 'sft-cal-sat';
  return undefined;
}

/** WeekView — a 7-day × 24-hour time grid with absolutely-positioned event chips. */
export function WeekView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  selectedEvent,
  previewEvent,
  onEventClick,
  onAddEventClick,
  onTimeRangeSelect,
  onEventTimeChange,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const weekStart = weekDays[0] as Date;
  const weekEnd = weekDays[weekDays.length - 1] as Date;
  const expanded = expandRecurringEvents(events, weekStart, weekEnd);

  const eventsForDay = (date: Date) =>
    expanded
      .filter((event) => {
        const startMatch =
          event.date.getDate() === date.getDate() &&
          event.date.getMonth() === date.getMonth() &&
          event.date.getFullYear() === date.getFullYear();
        let inRange = startMatch;
        if (!inRange && event.endDate) {
          const check = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const s = new Date(
            event.date.getFullYear(),
            event.date.getMonth(),
            event.date.getDate(),
          ).getTime();
          const e = new Date(
            event.endDate.getFullYear(),
            event.endDate.getMonth(),
            event.endDate.getDate(),
          ).getTime();
          inRange = check >= s && check <= e;
        }
        return inRange;
      })
      .filter((event) => !event.categoryId || selectedCategoryIds.includes(event.categoryId));

  // one ref per day column, keyed by column index — the drag math for
  // whichever column started the interaction reads its own rect
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  const createRef = useRef<{ dayIndex: number; startMin: number } | null>(null);
  const [createPreview, setCreatePreview] = useState<{
    dayIndex: number;
    startMin: number;
    endMin: number;
  } | null>(null);

  const moveRef = useRef<{
    event: CalendarEvent;
    dayIndex: number;
    mode: MoveMode;
    startY: number;
    origStart: number;
    origEnd: number;
    moved: boolean;
  } | null>(null);
  const justMovedRef = useRef(false);
  const [livePreview, setLivePreview] = useState<{
    id: string;
    startMin: number;
    endMin: number;
  } | null>(null);
  // mirrors of the two preview states above, read (not written) in onUp — in
  // StrictMode, a functional setState updater runs twice, so any side effect
  // (calling onTimeRangeSelect/onEventTimeChange) must live outside of one
  const createPreviewRef = useRef<{ dayIndex: number; startMin: number; endMin: number } | null>(
    null,
  );
  const livePreviewRef = useRef<{ id: string; startMin: number; endMin: number } | null>(null);
  // which day column a "move" drag is currently hovering — only 'move' can
  // cross columns; resizes stay within their original day
  const [moveDayIndex, setMoveDayIndex] = useState<number | null>(null);

  const [interacting, setInteracting] = useState(false);

  const findColIndexAtX = (x: number): number | null => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) return i;
    }
    return null;
  };

  useEffect(() => {
    if (!interacting) return;

    function onMove(e: PointerEvent) {
      if (createRef.current) {
        const rect = colRefs.current[createRef.current.dayIndex]?.getBoundingClientRect();
        // a momentary zero-height rect (mid-layout) must not produce NaN/Infinity
        // math that then gets committed as garbage start/end times
        if (!rect || rect.height <= 0) return;
        const m = snapMinutes(minutesFromY(e.clientY, rect));
        const next = {
          dayIndex: createRef.current.dayIndex,
          startMin: createRef.current.startMin,
          endMin: m,
        };
        createPreviewRef.current = next;
        setCreatePreview(next);
        return;
      }

      const mv = moveRef.current;
      if (mv) {
        if (mv.mode === 'move') {
          const hoverIdx = findColIndexAtX(e.clientX);
          if (hoverIdx != null && hoverIdx !== mv.dayIndex) {
            mv.dayIndex = hoverIdx;
            setMoveDayIndex(hoverIdx);
          }
        }
        const rect = colRefs.current[mv.dayIndex]?.getBoundingClientRect();
        if (!rect || rect.height <= 0) return;
        if (!mv.moved && Math.abs(e.clientY - mv.startY) > 4) mv.moved = true;
        if (!mv.moved) return;
        const deltaMin = snapMinutes(((e.clientY - mv.startY) / rect.height) * 24 * 60);
        let newStart = mv.origStart;
        let newEnd = mv.origEnd;
        if (mv.mode === 'move') {
          newStart = mv.origStart + deltaMin;
          newEnd = mv.origEnd + deltaMin;
          if (newStart < 0) {
            newEnd -= newStart;
            newStart = 0;
          }
          if (newEnd > 24 * 60) {
            newStart -= newEnd - 24 * 60;
            newEnd = 24 * 60;
          }
        } else if (mv.mode === 'resize-start') {
          newStart = Math.max(0, Math.min(mv.origEnd - MIN_EVENT_MINUTES, mv.origStart + deltaMin));
        } else {
          newEnd = Math.min(
            24 * 60,
            Math.max(mv.origStart + MIN_EVENT_MINUTES, mv.origEnd + deltaMin),
          );
        }
        const next = { id: mv.event.id, startMin: newStart, endMin: newEnd };
        livePreviewRef.current = next;
        setLivePreview(next);
      }
    }

    function onUp() {
      if (createRef.current) {
        const dayIndex = createRef.current.dayIndex;
        const day = weekDays[dayIndex];
        const p = createPreviewRef.current;
        if (p && day && Number.isFinite(p.startMin) && Number.isFinite(p.endMin)) {
          const s = Math.min(p.startMin, p.endMin);
          const e = Math.max(p.startMin, p.endMin);
          if (e - s >= MIN_EVENT_MINUTES) onTimeRangeSelect(day, s, e);
        }
        createRef.current = null;
        createPreviewRef.current = null;
        setCreatePreview(null);
      }
      if (moveRef.current?.moved) {
        const mv = moveRef.current;
        const p = livePreviewRef.current;
        if (p && Number.isFinite(p.startMin) && Number.isFinite(p.endMin)) {
          justMovedRef.current = true;
          const newDay = weekDays[mv.dayIndex];
          const dayChanged = newDay && !isSameDay(newDay, mv.event.date);
          onEventTimeChange(mv.event, p.startMin, p.endMin, dayChanged ? newDay : undefined);
        }
      }
      moveRef.current = null;
      livePreviewRef.current = null;
      setLivePreview(null);
      setMoveDayIndex(null);
      setInteracting(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interacting, onTimeRangeSelect, onEventTimeChange]);

  const beginCreate = (e: ReactPointerEvent, dayIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
    // drag-to-create starts on the vertically-scrollable timegrid column, so on
    // touch we let the column scroll instead (create a timed event via the modal)
    if (e.pointerType === 'touch') return;
    const rect = colRefs.current[dayIndex]?.getBoundingClientRect();
    if (!rect) return;
    const m = snapMinutes(minutesFromY(e.clientY, rect));
    createRef.current = { dayIndex, startMin: m };
    setCreatePreview({ dayIndex, startMin: m, endMin: m });
    setInteracting(true);
  };

  const beginMove = (
    e: ReactPointerEvent,
    event: CalendarEvent,
    dayIndex: number,
    mode: MoveMode,
  ) => {
    // move/resize track via column geometry (getBoundingClientRect + clientX/Y),
    // which works under touch's implicit capture too — so this stays enabled for
    // touch; the event chip sets `touch-action: none` to claim the drag gesture
    // recurring events can be moved (the host resolves this/following/all
    // via a scope dialog) but not resized — a resize only makes sense
    // against a single occurrence's concrete start/end time
    if ((event.recurrence || event.isRecurringInstance) && mode !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    const origStart = hhmmToMinutes(event.startTime);
    const origEnd = event.endTime ? hhmmToMinutes(event.endTime) : origStart + 60;
    moveRef.current = {
      event,
      dayIndex,
      mode,
      startY: e.clientY,
      origStart,
      origEnd,
      moved: false,
    };
    setInteracting(true);
  };

  const handleEventItemClick = (e: ReactMouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (justMovedRef.current) {
      justMovedRef.current = false;
      return;
    }
    onEventClick(event, e.currentTarget as HTMLElement);
  };

  // keyboard navigation: one roving-tabindex hour slot, Up/Down moves it by
  // an hour, Left/Right moves it a day — mirrors MonthView's focusedIndex
  // pattern. Stays null until the grid is actually focused, so mounting
  // never steals focus.
  const [focusedCell, setFocusedCell] = useState<{ dayIndex: number; hour: number } | null>(null);
  const slotRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!focusedCell) return;
    slotRefs.current[`${focusedCell.dayIndex}-${focusedCell.hour}`]?.focus();
  }, [focusedCell]);

  const defaultCell = { dayIndex: Math.max(0, weekDays.findIndex((d) => isToday(d))), hour: 9 };
  const activeCell = focusedCell ?? defaultCell;

  return (
    <div className="sft-cal-timegrid sft-cal-timegrid--week">
      <div className="sft-cal-timegrid__corner" />
      {weekDays.map((day, dayIndex) => {
        const cls = dayColorClass(day.getDay());
        return (
          <div
            key={day.toISOString()}
            className="sft-cal-timegrid__colhead"
            data-movetarget={moveDayIndex === dayIndex || undefined}
          >
            <span
              className={cls ? `sft-cal-timegrid__daylabel ${cls}` : 'sft-cal-timegrid__daylabel'}
              data-today={isToday(day) || undefined}
            >
              {(dayNames[language] ?? dayNames.en ?? [])[day.getDay()]} ({day.getDate()})
            </span>
          </div>
        );
      })}

      <div className="sft-cal-timegrid__hours">
        {HOURS.map((hour) => (
          <div key={hour} className="sft-cal-timegrid__hour">
            <span className="sft-cal-timegrid__hourlabel">
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>

      {weekDays.map((day, dayIndex) => (
        <div
          key={`col-${day.toISOString()}`}
          className="sft-cal-timegrid__col"
          ref={(el) => {
            colRefs.current[dayIndex] = el;
          }}
          onPointerDown={(e) => beginCreate(e, dayIndex)}
        >
          {HOURS.map((hour) => (
            <button
              key={hour}
              ref={(el) => {
                slotRefs.current[`${dayIndex}-${hour}`] = el;
              }}
              type="button"
              className="sft-cal-timegrid__slot"
              tabIndex={activeCell.dayIndex === dayIndex && activeCell.hour === hour ? 0 : -1}
              aria-label={`${(dayNames[language] ?? dayNames.en ?? [])[day.getDay()]} ${day.getDate()}, ${hour.toString().padStart(2, '0')}:00`}
              onFocus={() => setFocusedCell({ dayIndex, hour })}
              onKeyDown={(e) => {
                let nd = dayIndex;
                let nh = hour;
                if (e.key === 'ArrowDown') nh = Math.min(23, hour + 1);
                else if (e.key === 'ArrowUp') nh = Math.max(0, hour - 1);
                else if (e.key === 'ArrowRight') nd = Math.min(weekDays.length - 1, dayIndex + 1);
                else if (e.key === 'ArrowLeft') nd = Math.max(0, dayIndex - 1);
                else return;
                e.preventDefault();
                setFocusedCell({ dayIndex: nd, hour: nh });
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
                onAddEventClick(day, hour, e.clientX, e.clientY);
              }}
            />
          ))}

          {eventsForDay(day).map((event) => {
            // while cross-day dragging (mode 'move' hovering a different
            // column), hide the original — a ghost renders in the hovered
            // column instead, below
            if (
              moveRef.current?.event.id === event.id &&
              moveRef.current.mode === 'move' &&
              moveDayIndex != null &&
              moveDayIndex !== dayIndex
            ) {
              return null;
            }
            const isEditing = selectedEvent?.id === event.id && previewEvent;
            const live = livePreview?.id === event.id ? livePreview : null;
            const data = isEditing
              ? {
                  title: previewEvent.title,
                  startTime: previewEvent.startTime,
                  endTime: previewEvent.endTime,
                  categoryId: previewEvent.categoryId,
                }
              : event;
            const color = categories.find((c) => c.id === data.categoryId)?.color || '#E30000';
            const startMin = live ? live.startMin : hhmmToMinutes(data.startTime);
            const endMin = live
              ? live.endMin
              : data.endTime
                ? hhmmToMinutes(data.endTime)
                : startMin + 60;
            const top = (startMin / (24 * 60)) * 100;
            const height = ((endMin - startMin) / (24 * 60)) * 100;
            const resizable = !event.recurrence && !event.isRecurringInstance;
            return (
              <div
                key={event.id}
                data-event="true"
                data-movable="true"
                className="sft-cal-timeevent"
                data-editing={isEditing || undefined}
                role="button"
                tabIndex={0}
                aria-label={data.title || pick(language, '(제목 없음)', '(No title)')}
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  left: '4px',
                  width: 'calc(100% - 8px)',
                  background: withAlpha(color, 0.12),
                  borderLeft: `3px solid ${color}`,
                }}
                onPointerDown={(e) => beginMove(e, event, dayIndex, 'move')}
                onClick={(e) => handleEventItemClick(e, event)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onEventClick(event, e.currentTarget);
                  }
                }}
              >
                {resizable && (
                  <span
                    className="sft-cal-timeevent__resize sft-cal-timeevent__resize--top"
                    onPointerDown={(e) => beginMove(e, event, dayIndex, 'resize-start')}
                  />
                )}
                <div className="sft-cal-timeevent__label" style={{ color }}>
                  {event.recurrence && <Repeat size={12} />}
                  <span className="sft-cal-timeevent__title">
                    {data.title || pick(language, '(제목 없음)', '(No title)')}
                  </span>
                </div>
                {resizable && (
                  <span
                    className="sft-cal-timeevent__resize sft-cal-timeevent__resize--bottom"
                    onPointerDown={(e) => beginMove(e, event, dayIndex, 'resize-end')}
                  />
                )}
              </div>
            );
          })}

          {/* drag-to-create preview: a plain draft bar spanning the dragged range */}
          {createPreview &&
            createPreview.dayIndex === dayIndex &&
            (() => {
              const s = Math.min(createPreview.startMin, createPreview.endMin);
              const e = Math.max(createPreview.startMin, createPreview.endMin);
              const top = (s / (24 * 60)) * 100;
              const height = ((e - s) / (24 * 60)) * 100;
              return (
                <div
                  className="sft-cal-timeevent sft-cal-timeevent--draft"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: '4px',
                    width: 'calc(100% - 8px)',
                  }}
                >
                  <div className="sft-cal-timeevent__label">
                    <span className="sft-cal-timeevent__title">
                      {minutesToHHMM(s)}–{minutesToHHMM(e)}
                    </span>
                  </div>
                </div>
              );
            })()}

          {/* cross-day drag ghost: only shown in the hovered column while a
              "move" drag has left the event's original day column */}
          {moveDayIndex === dayIndex &&
            livePreview &&
            (() => {
              const mv = moveRef.current;
              if (!mv || mv.mode !== 'move') return null;
              const originalDayIndex = weekDays.findIndex((d) => isSameDay(d, mv.event.date));
              if (originalDayIndex === dayIndex) return null; // same column — already rendered above
              const color =
                categories.find((c) => c.id === mv.event.categoryId)?.color || '#E30000';
              const top = (livePreview.startMin / (24 * 60)) * 100;
              const height = ((livePreview.endMin - livePreview.startMin) / (24 * 60)) * 100;
              return (
                <div
                  className="sft-cal-timeevent"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: '4px',
                    width: 'calc(100% - 8px)',
                    background: withAlpha(color, 0.12),
                    borderLeft: `3px solid ${color}`,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="sft-cal-timeevent__label" style={{ color }}>
                    {mv.event.recurrence && <Repeat size={12} />}
                    <span className="sft-cal-timeevent__title">
                      {mv.event.title || pick(language, '(제목 없음)', '(No title)')}
                    </span>
                  </div>
                </div>
              );
            })()}
        </div>
      ))}
    </div>
  );
}
