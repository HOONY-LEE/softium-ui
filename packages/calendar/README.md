# @softium/calendar

A full calendar UI for React: month / week / day / year views, an event
create/edit modal with categories and recurrence (daily/weekly/monthly/yearly),
drag-to-create / move / resize, keyboard navigation, undo/redo, and holidays.
Token-CSS themed — no Tailwind.

Part of [softium-ui](https://github.com/HOONY-LEE/softium-ui).

## Install

```bash
npm i @softium/calendar
```

`react` and `react-dom` (`^18` or `^19`) are peer dependencies.

## Usage

Import the stylesheet once, then render `<Calendar>`:

```tsx
import '@softium/calendar/styles.css';
import { Calendar } from '@softium/calendar';

export function Demo() {
  return (
    <Calendar
      language="en"
      initialEvents={[
        { id: '1', title: 'Standup', date: new Date(), startTime: '10:00', endTime: '10:30' },
      ]}
    />
  );
}
```

Pass a `controller` from `useCalendar()` to drive events/categories from your
own state, or let `Calendar` manage them internally. Recurring-event edits
(move/delete) prompt a "this / this-and-following / all" scope dialog.

## Theming

Plain CSS custom properties (`--sft-*`). Dark mode via `prefers-color-scheme`
or `<html data-theme="dark">`. The stylesheet inlines the shared design tokens,
so this one import is self-contained.

## License

MIT © Sunghoon Lee
