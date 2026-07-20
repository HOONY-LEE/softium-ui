import { useRef } from 'react';
import { pick } from '../i18n';
import type { CalendarEvent, Category } from '../types';
import { formatDate, isToday } from '../utils/date';
import { expandRecurringEvents } from '../utils/events';

export interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: string;
  onDateClick: (date: Date) => void;
  onViewChange: (view: 'month') => void;
}

const MINI_DAY_LABELS: Record<string, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

/** YearView — a 12-up grid of mini month calendars with per-day event dots. */
export function YearView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  onDateClick,
  onViewChange,
}: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // arrow-key day-to-day navigation across month boundaries — DOM lookup by
  // a data-daykey instead of tracked state, since a flat index across 12
  // variable-length mini-grids is awkward to maintain
  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let delta = 0;
    if (e.key === 'ArrowRight') delta = 1;
    else if (e.key === 'ArrowLeft') delta = -1;
    else if (e.key === 'ArrowDown') delta = 7;
    else if (e.key === 'ArrowUp') delta = -7;
    else return;
    e.preventDefault();
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
    if (next.getFullYear() !== year) return; // stays within this year view
    const target = containerRef.current?.querySelector<HTMLButtonElement>(
      `[data-daykey="${formatDate(next)}"]`,
    );
    target?.focus();
  };

  const expanded = expandRecurringEvents(
    events,
    new Date(year, 0, 1),
    new Date(year, 11, 31),
  ).filter((e) => !e.categoryId || selectedCategoryIds.includes(e.categoryId));

  const countForMonth = (monthIndex: number) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return expanded.filter((e) => {
      const s = e.date;
      const en = e.endDate ?? e.date;
      return (s >= start && s <= end) || (en >= start && en <= end) || (s < start && en > end);
    }).length;
  };

  const renderMini = (monthIndex: number) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const labels = MINI_DAY_LABELS[language] ?? MINI_DAY_LABELS.en ?? [];

    return (
      <div className="sft-cal-mini">
        <div className="sft-cal-mini__head">
          <h3 className="sft-cal-mini__title">
            {pick(
              language,
              `${monthIndex + 1}월`,
              new Date(year, monthIndex).toLocaleDateString('en-US', { month: 'long' }),
            )}
          </h3>
          <span className="sft-cal-mini__count">
            {countForMonth(monthIndex)} {pick(language, '개 일정', 'events')}
          </span>
        </div>
        <div className="sft-cal-mini__weekdays">
          {labels.map((d, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-item header
            <div key={i} className="sft-cal-mini__weekday">
              {d}
            </div>
          ))}
        </div>
        <div className="sft-cal-mini__grid">
          {cells.map((day, index) => {
            const date = day ? new Date(year, monthIndex, day) : null;
            const today = date ? isToday(date) : false;
            const dayEvents = date
              ? expanded.filter((e) => {
                  const norm = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  ).getTime();
                  const s = new Date(
                    e.date.getFullYear(),
                    e.date.getMonth(),
                    e.date.getDate(),
                  ).getTime();
                  const en = e.endDate
                    ? new Date(
                        e.endDate.getFullYear(),
                        e.endDate.getMonth(),
                        e.endDate.getDate(),
                      ).getTime()
                    : s;
                  return norm >= s && norm <= en;
                })
              : [];
            return (
              <button
                key={day ? `d${day}` : `empty-${index}`}
                type="button"
                className="sft-cal-mini__day"
                data-today={today || undefined}
                data-empty={!day || undefined}
                data-daykey={date ? formatDate(date) : undefined}
                disabled={!day}
                aria-label={date ? `${year}-${monthIndex + 1}-${day}` : undefined}
                onKeyDown={(e) => date && handleDayKeyDown(e, date)}
                onClick={() => {
                  if (day) {
                    onDateClick(new Date(year, monthIndex, 1));
                    onViewChange('month');
                  }
                }}
              >
                {day}
                {dayEvents.length > 0 && !today && (
                  <span className="sft-cal-mini__dots">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: at most 3 decorative dots
                        key={i}
                        className="sft-cal-mini__dot"
                        style={{
                          background:
                            categories.find((c) => c.id === e.categoryId)?.color || '#E30000',
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="sft-cal-year" ref={containerRef}>
      <div className="sft-cal-year__grid">
        {months.map((m) => (
          <div key={m} className="sft-cal-year__cell">
            {renderMini(m)}
          </div>
        ))}
      </div>
    </div>
  );
}
