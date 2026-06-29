import type { ReactNode } from 'react';

export type DateFormat =
  | 'date' // 2026. 6. 29.
  | 'datetime' // 2026. 6. 29. 14:30
  | 'time' // 14:30
  | 'month' // 2026. 6.
  | 'year' // 2026
  | 'iso' // 2026-06-29
  | 'relative'; // 3일 전 / in 2 days

export interface DateTextProps {
  value: string | number | Date | null | undefined;
  /** display format. Default 'date'. */
  format?: DateFormat;
  /** BCP-47 locale (defaults to the runtime locale) */
  locale?: string;
}

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function relative(d: Date, locale?: string): string {
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diffMs / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day');
  if (abs < 365 * day) return rtf.format(Math.round(diffMs / (30 * day)), 'month');
  return rtf.format(Math.round(diffMs / (365 * day)), 'year');
}

/** DateText — formatted date/time with several display variants. */
export function DateText({ value, format = 'date', locale }: DateTextProps): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return <span className="sft-date">{String(value)}</span>;

  let text: string;
  switch (format) {
    case 'datetime':
      text = d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
      break;
    case 'time':
      text = d.toLocaleTimeString(locale, { timeStyle: 'short' });
      break;
    case 'month':
      text = d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
      break;
    case 'year':
      text = String(d.getFullYear());
      break;
    case 'iso':
      text = d.toISOString().slice(0, 10);
      break;
    case 'relative':
      text = relative(d, locale);
      break;
    default:
      text = d.toLocaleDateString(locale);
  }
  return (
    <time className="sft-date" dateTime={d.toISOString()}>
      {text}
    </time>
  );
}
