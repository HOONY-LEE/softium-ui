import { Repeat } from 'lucide-react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, PreviewEvent } from '../types';
import { withAlpha } from '../utils/color';
import { dayNames } from '../utils/date';
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
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

      <div className="sft-cal-timegrid__col">
        {HOURS.map((hour) => (
          <button
            key={hour}
            type="button"
            className="sft-cal-timegrid__slot"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
              onAddEventClick(currentDate, hour, e.clientX, e.clientY);
            }}
          />
        ))}

        {dayEvents.map((event) => {
          const isEditing = selectedEvent?.id === event.id && previewEvent;
          const data = isEditing
            ? {
                title: previewEvent.title,
                startTime: previewEvent.startTime,
                endTime: previewEvent.endTime,
                categoryId: previewEvent.categoryId,
              }
            : event;
          const color = categories.find((c) => c.id === data.categoryId)?.color || '#E30000';
          const sh = data.startTime ? Number.parseInt(data.startTime.split(':')[0] ?? '0', 10) : 0;
          const sm = data.startTime ? Number.parseInt(data.startTime.split(':')[1] ?? '0', 10) : 0;
          const eh = data.endTime ? Number.parseInt(data.endTime.split(':')[0] ?? '0', 10) : sh + 1;
          const em = data.endTime ? Number.parseInt(data.endTime.split(':')[1] ?? '0', 10) : 0;
          const top = ((sh * 60 + sm) / (24 * 60)) * 100;
          const height = ((eh * 60 + em - (sh * 60 + sm)) / (24 * 60)) * 100;
          return (
            <div
              key={event.id}
              data-event="true"
              className="sft-cal-timeevent"
              data-editing={isEditing || undefined}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                left: '8px',
                width: 'calc(100% - 16px)',
                background: withAlpha(color, 0.12),
                borderLeft: `3px solid ${color}`,
              }}
              onClick={(e) => onEventClick(event, e.currentTarget)}
            >
              <div className="sft-cal-timeevent__label" style={{ color }}>
                {event.recurrence && <Repeat size={12} />}
                <span className="sft-cal-timeevent__title">
                  {data.title || pick(language, '(제목 없음)', '(No title)')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
