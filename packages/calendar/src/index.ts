/**
 * @softium/calendar
 *
 * A full calendar UI (month / week / day / year views + an event create/edit
 * modal with categories and recurrence), token-CSS themed. Import the stylesheet
 * once:  import '@softium/calendar/styles.css';
 */

export const VERSION = '0.0.0';

export { Calendar } from './Calendar';
export type { CalendarProps } from './Calendar';

export { useCalendar } from './hooks/useCalendar';
export type { CalendarController, UseCalendarOptions } from './hooks/useCalendar';

// views (advanced composition)
export { MonthView } from './views/MonthView';
export type { MonthViewProps } from './views/MonthView';
export { WeekView } from './views/WeekView';
export type { WeekViewProps } from './views/WeekView';
export { DayView } from './views/DayView';
export type { DayViewProps } from './views/DayView';
export { YearView } from './views/YearView';
export type { YearViewProps } from './views/YearView';

// building blocks
export { EventModal } from './components/EventModal';
export type { EventModalProps, EventSaveData } from './components/EventModal';
export { RecurrenceSection } from './components/RecurrenceSection';
export type { RecurrenceSectionProps, RecurrenceEndType } from './components/RecurrenceSection';
export { DeleteOptionsDialog } from './components/DeleteOptionsDialog';
export type { DeleteOptionsDialogProps, DeleteType } from './components/DeleteOptionsDialog';
export { CategoryItem } from './components/CategoryItem';
export type { CategoryItemProps } from './components/CategoryItem';
export { CategoryFilter } from './components/CategoryFilter';
export type { CategoryFilterProps } from './components/CategoryFilter';
export { SegmentTabs } from './components/SegmentTabs';
export type { SegmentTabsProps, SegmentOption } from './components/SegmentTabs';

// utils
export { COLOR_PRESETS, findClosestPresetColor, withAlpha } from './utils/color';
export {
  expandRecurringEvents,
  getEventsForDate,
  getNextAvailableTime,
  eventCoversDate,
} from './utils/events';
export * from './utils/date';

// types
export type {
  ViewType,
  RecurrenceFreq,
  Recurrence,
  Category,
  CalendarEvent,
  PreviewEvent,
} from './types';
export type { CalLocale } from './i18n';
