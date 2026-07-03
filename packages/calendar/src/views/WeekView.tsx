import { Repeat } from 'lucide-react';
import { pick } from '../i18n';
import type { CalendarEvent, Category, PreviewEvent } from '../types';
import { withAlpha } from '../utils/color';
import { dayNames, getWeekDays, isToday } from '../utils/date';
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
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

  return (
    <div className="sft-cal-timegrid sft-cal-timegrid--week">
      <div className="sft-cal-timegrid__corner" />
      {weekDays.map((day) => {
        const cls = dayColorClass(day.getDay());
        return (
          <div key={day.toISOString()} className="sft-cal-timegrid__colhead">
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

      {weekDays.map((day) => (
        <div key={`col-${day.toISOString()}`} className="sft-cal-timegrid__col">
          {HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              className="sft-cal-timegrid__slot"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-event="true"]')) return;
                onAddEventClick(day, hour, e.clientX, e.clientY);
              }}
            />
          ))}

          {eventsForDay(day).map((event) => {
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
            const sh = data.startTime
              ? Number.parseInt(data.startTime.split(':')[0] ?? '0', 10)
              : 0;
            const sm = data.startTime
              ? Number.parseInt(data.startTime.split(':')[1] ?? '0', 10)
              : 0;
            const eh = data.endTime
              ? Number.parseInt(data.endTime.split(':')[0] ?? '0', 10)
              : sh + 1;
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
                  left: '4px',
                  width: 'calc(100% - 8px)',
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
      ))}
    </div>
  );
}
