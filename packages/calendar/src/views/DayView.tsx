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
import { dayNames, hhmmToMinutes, minutesFromY, minutesToHHMM, snapMinutes } from '../utils/date';
import { expandRecurringEvents } from '../utils/events';

export interface DayViewProps {
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
   * time. For a recurring event, the host is expected to resolve a
   * "this/following/all" scope before actually committing */
  onEventTimeChange: (event: CalendarEvent, startMin: number, endMin: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_EVENT_MINUTES = 15;

type MoveMode = 'move' | 'resize-start' | 'resize-end';

/** DayView — a single-day × 24-hour time grid. */
export function DayView({
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
}: DayViewProps) {
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);
  const expanded = expandRecurringEvents(events, dayStart, dayEnd);

  const dayEvents = expanded
    .filter((event) => {
      const startMatch =
        event.date.getDate() === currentDate.getDate() &&
        event.date.getMonth() === currentDate.getMonth() &&
        event.date.getFullYear() === currentDate.getFullYear();
      let inRange = startMatch;
      if (!inRange && event.endDate) {
        const check = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
        ).getTime();
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

  const dow = currentDate.getDay();
  const dayCls = dow === 0 ? 'sft-cal-sun' : dow === 6 ? 'sft-cal-sat' : undefined;

  const colRef = useRef<HTMLDivElement | null>(null);

  // drag-to-create: mousedown on empty grid area, drag to span a range
  const createRef = useRef<{ startMin: number } | null>(null);
  const [createPreview, setCreatePreview] = useState<{ startMin: number; endMin: number } | null>(
    null,
  );

  // drag-to-move / resize an existing (non-recurring) timed event
  const moveRef = useRef<{
    event: CalendarEvent;
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
  const createPreviewRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const livePreviewRef = useRef<{ id: string; startMin: number; endMin: number } | null>(null);

  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    if (!interacting) return;

    function onMove(e: PointerEvent) {
      const rect = colRef.current?.getBoundingClientRect();
      // a momentary zero-height rect (mid-layout) must not produce NaN/Infinity
      // math that then gets committed as garbage start/end times
      if (!rect || rect.height <= 0) return;

      if (createRef.current) {
        const m = snapMinutes(minutesFromY(e.clientY, rect));
        const next = { startMin: createRef.current.startMin, endMin: m };
        createPreviewRef.current = next;
        setCreatePreview(next);
        return;
      }

      const mv = moveRef.current;
      if (mv) {
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
        const p = createPreviewRef.current;
        if (p && Number.isFinite(p.startMin) && Number.isFinite(p.endMin)) {
          const s = Math.min(p.startMin, p.endMin);
          const e = Math.max(p.startMin, p.endMin);
          if (e - s >= MIN_EVENT_MINUTES) onTimeRangeSelect(currentDate, s, e);
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
          onEventTimeChange(mv.event, p.startMin, p.endMin);
        }
      }
      moveRef.current = null;
      livePreviewRef.current = null;
      setLivePreview(null);
      setInteracting(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [interacting, currentDate, onTimeRangeSelect, onEventTimeChange]);

  const beginCreate = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
    // drag-to-create starts on the vertically-scrollable timegrid column, so on
    // touch we let the column scroll instead (create a timed event via the modal)
    if (e.pointerType === 'touch') return;
    const rect = colRef.current?.getBoundingClientRect();
    if (!rect) return;
    const m = snapMinutes(minutesFromY(e.clientY, rect));
    createRef.current = { startMin: m };
    setCreatePreview({ startMin: m, endMin: m });
    setInteracting(true);
  };

  const beginMove = (e: ReactPointerEvent, event: CalendarEvent, mode: MoveMode) => {
    // move/resize track via column geometry (works under touch's implicit
    // capture), so they stay enabled for touch; the chip sets touch-action:none
    // recurring events can be moved (the host resolves this/following/all
    // via a scope dialog) but not resized — a resize only makes sense
    // against a single occurrence's concrete start/end time
    if ((event.recurrence || event.isRecurringInstance) && mode !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    const origStart = hhmmToMinutes(event.startTime);
    const origEnd = event.endTime ? hhmmToMinutes(event.endTime) : origStart + 60;
    moveRef.current = { event, mode, startY: e.clientY, origStart, origEnd, moved: false };
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
  // an hour — mirrors MonthView's focusedIndex/cellRefs pattern. Stays null
  // until the grid is actually focused, so mounting never steals focus.
  const [focusedHour, setFocusedHour] = useState<number | null>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (focusedHour == null) return;
    slotRefs.current[focusedHour]?.focus();
  }, [focusedHour]);

  return (
    <div className="sft-cal-timegrid sft-cal-timegrid--day">
      <div className="sft-cal-timegrid__corner" />
      <div className="sft-cal-timegrid__colhead">
        <span
          className={dayCls ? `sft-cal-timegrid__daylabel ${dayCls}` : 'sft-cal-timegrid__daylabel'}
        >
          {(dayNames[language] ?? dayNames.en ?? [])[dow]} ({currentDate.getDate()})
        </span>
      </div>

      <div className="sft-cal-timegrid__hours">
        {HOURS.map((hour) => (
          <div key={hour} className="sft-cal-timegrid__hour">
            <span className="sft-cal-timegrid__hourlabel">
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>

      <div className="sft-cal-timegrid__col" ref={colRef} onPointerDown={beginCreate}>
        {HOURS.map((hour) => (
          <button
            key={hour}
            ref={(el) => {
              slotRefs.current[hour] = el;
            }}
            type="button"
            className="sft-cal-timegrid__slot"
            tabIndex={(focusedHour ?? 9) === hour ? 0 : -1}
            aria-label={`${hour.toString().padStart(2, '0')}:00`}
            onFocus={() => setFocusedHour(hour)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedHour(Math.min(23, hour + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedHour(Math.max(0, hour - 1));
              }
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
              onAddEventClick(currentDate, hour, e.clientX, e.clientY);
            }}
          />
        ))}

        {dayEvents.map((event) => {
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
                left: '8px',
                width: 'calc(100% - 16px)',
                background: withAlpha(color, 0.12),
                borderLeft: `3px solid ${color}`,
              }}
              onPointerDown={(e) => beginMove(e, event, 'move')}
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
                  onPointerDown={(e) => beginMove(e, event, 'resize-start')}
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
                  onPointerDown={(e) => beginMove(e, event, 'resize-end')}
                />
              )}
            </div>
          );
        })}

        {/* drag-to-create preview: a plain draft bar spanning the dragged range */}
        {createPreview &&
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
                  left: '8px',
                  width: 'calc(100% - 16px)',
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
      </div>
    </div>
  );
}
