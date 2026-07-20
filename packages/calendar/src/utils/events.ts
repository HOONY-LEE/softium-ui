import type { CalendarEvent, Recurrence } from '../types';
import { isSameDay } from './date';

/** editor weekday index (Mon=0…Sun=6) → JS getDay() (Sun=0…Sat=6) */
const toJsDay = (editorIndex: number) => (editorIndex + 1) % 7;
/** JS getDay() → editor weekday index */
const toEditorDay = (jsDay: number) => (jsDay + 6) % 7;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * All occurrence *dates* of a recurring series that fall in [from, to]
 * (inclusive), honouring interval / byweekday / until / count. No rrule dep —
 * a compact engine covering DAILY / WEEKLY / MONTHLY / YEARLY. Exported for
 * "this and following" recurrence splits (see Calendar.tsx's
 * handleRecurrenceScopeConfirm), which needs to know how many occurrences
 * land before a given split date to carry over a correct remaining `count`.
 */
export function occurrencesInRange(base: Date, rec: Recurrence, from: Date, to: Date): Date[] {
  const interval = Math.max(1, rec.interval || 1);
  const out: Date[] = [];
  const until = rec.until ? startOfDay(rec.until) : null;
  const maxCount = rec.count ?? Number.POSITIVE_INFINITY;
  const windowFrom = startOfDay(from);
  const windowTo = startOfDay(to);
  const GUARD = 5000; // hard stop against pathological configs

  let produced = 0;

  const consider = (d: Date): boolean => {
    // returns false when we've gone past every stopping condition
    const day = startOfDay(d);
    if (until && day > until) return false;
    if (produced >= maxCount) return false;
    produced += 1;
    if (day >= windowFrom && day <= windowTo) out.push(day);
    return true;
  };

  if (rec.freq === 'WEEKLY' && rec.byweekday && rec.byweekday.length > 0) {
    // walk week by week; within each active week emit the selected weekdays
    const weekdays = [...rec.byweekday].map(toJsDay).sort((a, b) => a - b);
    // anchor to the Sunday of the base week
    const weekStart = startOfDay(base);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    for (let w = 0; w < GUARD; w++) {
      const wkStart = new Date(weekStart);
      wkStart.setDate(weekStart.getDate() + w * 7 * interval);
      if (wkStart > windowTo && produced > 0) break;
      let stop = false;
      for (const jsDay of weekdays) {
        const d = new Date(wkStart);
        d.setDate(wkStart.getDate() + jsDay);
        if (startOfDay(d) < startOfDay(base)) continue; // before series start
        if (!consider(d)) {
          stop = true;
          break;
        }
      }
      if (stop) break;
      if (produced >= maxCount) break;
      if (wkStart > windowTo) break;
    }
    return out;
  }

  // DAILY / WEEKLY(no byweekday) / MONTHLY / YEARLY — step from the base date
  for (let i = 0; i < GUARD; i++) {
    const d = new Date(base);
    if (rec.freq === 'DAILY') d.setDate(base.getDate() + i * interval);
    else if (rec.freq === 'WEEKLY') d.setDate(base.getDate() + i * 7 * interval);
    else if (rec.freq === 'MONTHLY') d.setMonth(base.getMonth() + i * interval);
    else d.setFullYear(base.getFullYear() + i * interval); // YEARLY
    if (!consider(d)) break;
    if (startOfDay(d) > windowTo && produced > 0 && maxCount === Number.POSITIVE_INFINITY) break;
  }
  return out;
}

/**
 * Expand every recurring master in `events` into concrete instances that fall
 * inside [startDate, endDate]; non-recurring events pass through unchanged.
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];
  for (const event of events) {
    if (!event.recurrence) {
      expanded.push(event);
      continue;
    }
    const occurrences = occurrencesInRange(event.date, event.recurrence, startDate, endDate);
    for (const occ of occurrences) {
      const excluded = event.exdate?.some((ex) => isSameDay(ex, occ));
      if (excluded) continue;
      // preserve the original time-of-day on each instance
      const date = new Date(
        occ.getFullYear(),
        occ.getMonth(),
        occ.getDate(),
        event.date.getHours(),
        event.date.getMinutes(),
      );
      expanded.push({
        ...event,
        id: `${event.id}-recur-${date.getTime()}`,
        date,
        isRecurringInstance: true,
        recurringEventId: event.id,
      });
    }
  }
  return expanded;
}

/** whether `date` falls inside an event's [date, endDate] span (day-granular) */
export function eventCoversDate(event: CalendarEvent, date: Date): boolean {
  if (isSameDay(event.date, date)) return true;
  if (!event.endDate) return false;
  const check = startOfDay(date).getTime();
  return check >= startOfDay(event.date).getTime() && check <= startOfDay(event.endDate).getTime();
}

/** events on a given date, category-filtered, sorted by start time */
export function getEventsForDate(
  date: Date | null,
  events: CalendarEvent[],
  selectedCategoryIds: string[],
): CalendarEvent[] {
  if (!date) return [];
  return events
    .filter((event) => {
      if (!eventCoversDate(event, date)) return false;
      if (event.categoryId && !selectedCategoryIds.includes(event.categoryId)) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      const ap = a.startTime.split(':');
      const bp = b.startTime.split(':');
      const aMin = Number(ap[0] ?? 0) * 60 + Number(ap[1] ?? 0);
      const bMin = Number(bp[0] ?? 0) * 60 + Number(bp[1] ?? 0);
      return aMin - bMin;
    });
}

/** first free hour ("HH:00") on a date, 09:00–23:00, else 09:00 */
export function getNextAvailableTime(date: Date | null, events: CalendarEvent[]): string {
  if (!date) return '09:00';
  const dayEvents = events.filter((e) => isSameDay(e.date, date));
  for (let hour = 9; hour < 24; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    if (!dayEvents.some((e) => e.startTime === timeStr)) return timeStr;
  }
  return '09:00';
}

const toEditorWeekday = toEditorDay;
export { toEditorWeekday };
