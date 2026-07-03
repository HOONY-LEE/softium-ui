import type { ViewType } from '../types';

export const monthNames: Record<string, string[]> = {
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

export const dayNames: Record<string, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** the month grid, including leading/trailing days from adjacent months */
export function getDaysInMonth(date: Date): { days: Date[]; rows: number } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: Date[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(new Date(year, month, -startingDayOfWeek + i + 1));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  const weeksNeeded = Math.ceil(days.length / 7);
  const remainingCells = weeksNeeded * 7 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return { days, rows: weeksNeeded };
}

/** the seven days (Sun→Sat) of the week containing `date` */
export function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(sunday);
    weekDay.setDate(sunday.getDate() + i);
    days.push(weekDay);
  }
  return days;
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date | null): boolean {
  return isSameDay(date, new Date());
}

export function isCurrentMonth(date: Date | null, currentDate: Date): boolean {
  if (!date) return false;
  return date.getMonth() === currentDate.getMonth();
}

export function getPreviousPeriodDate(currentDate: Date, viewType: ViewType): Date {
  const d = new Date(currentDate);
  if (viewType === 'day') d.setDate(currentDate.getDate() - 1);
  else if (viewType === 'week') d.setDate(currentDate.getDate() - 7);
  else if (viewType === 'year') return new Date(currentDate.getFullYear() - 1, 0, 1);
  else return new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  return d;
}

export function getNextPeriodDate(currentDate: Date, viewType: ViewType): Date {
  const d = new Date(currentDate);
  if (viewType === 'day') d.setDate(currentDate.getDate() + 1);
  else if (viewType === 'week') d.setDate(currentDate.getDate() + 7);
  else if (viewType === 'year') return new Date(currentDate.getFullYear() + 1, 0, 1);
  else return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  return d;
}

/** YYYY-MM-DD (local) */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
