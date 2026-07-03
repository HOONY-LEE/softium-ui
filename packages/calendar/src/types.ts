/**
 * softium-ui Calendar — core types.
 *
 * Ported from the calendary project into softium-ui's token-CSS conventions.
 * Server / Google-Calendar / today-task concerns are intentionally dropped —
 * this is a pure UI component driven by local state (or host-provided state).
 */

export type ViewType = 'day' | 'week' | 'month' | 'year';

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** every N periods (1 = every period) */
  interval: number;
  /** weekly only — weekdays as Mon=0 … Sun=6 (matches the recurrence editor) */
  byweekday?: number[];
  /** repeat until this date (inclusive) */
  until?: Date;
  /** repeat this many occurrences */
  count?: number;
}

export interface Category {
  id: string;
  name: string;
  /** hex color, e.g. "#E30000" */
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** start date (time-of-day carried separately in startTime) */
  date: Date;
  /** end date for multi-day / period events */
  endDate?: Date;
  /** "HH:MM" */
  startTime?: string;
  /** "HH:MM" */
  endTime?: string;
  description?: string;
  categoryId?: string;
  recurrence?: Recurrence;
  /** dates excluded from a recurring series */
  exdate?: Date[];
  /** true for a generated occurrence of a recurring series (never persisted) */
  isRecurringInstance?: boolean;
  /** id of the master event a recurring instance came from */
  recurringEventId?: string;
}

/** the working draft shown in an event's time-grid position while editing */
export interface PreviewEvent {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  categoryId: string;
  startDate?: Date;
  endDate?: Date;
  isPeriod?: boolean;
}
