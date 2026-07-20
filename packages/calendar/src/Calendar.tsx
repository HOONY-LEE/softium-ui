import { ChevronLeft, ChevronRight, Redo2, Search, Undo2, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryFilter } from './components/CategoryFilter';
import type { DeleteType } from './components/DeleteOptionsDialog';
import { EventModal, type EventSaveData } from './components/EventModal';
import { RecurrenceScopeDialog } from './components/RecurrenceScopeDialog';
import { SegmentTabs } from './components/SegmentTabs';
import { type CalendarController, useCalendar } from './hooks/useCalendar';
import { pick } from './i18n';
import type { CalendarEvent, Category, Holiday, PreviewEvent, ViewType } from './types';
import {
  getNextPeriodDate,
  getPreviousPeriodDate,
  getWeekDays,
  minutesToHHMM,
  monthNames,
} from './utils/date';
import { getNextAvailableTime, occurrencesInRange } from './utils/events';
import { DayView } from './views/DayView';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { YearView } from './views/YearView';

export interface CalendarProps {
  /** UI language for the calendar's own strings. Default 'ko'. */
  language?: string;
  /** an external controller (from useCalendar); one is created internally if omitted */
  controller?: CalendarController;
  initialEvents?: CalendarEvent[];
  initialCategories?: Category[];
  initialDate?: Date;
  initialView?: ViewType;
  /** holidays/observances shown as a label in the month view's date header */
  holidays?: Holiday[];
  className?: string;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** a drag-move on a recurring event/instance, awaiting the user's "this /
 * following / all" scope choice before it's actually applied */
interface PendingMove {
  master: CalendarEvent;
  /** the dragged occurrence's original date (its identity within the series) */
  instanceDate: Date;
  /** target date (day-granular) the event was dropped on */
  newDate: Date;
  /** set only when the drag also changed the time (week/day view) */
  newStartTime?: string;
  newEndTime?: string;
}

/**
 * Calendar — the full calendar UI: a toolbar (title, prev/next/today, search,
 * category filter, view switcher) over month/week/day/year views, with an
 * event create/edit modal. Ported from the calendary project into softium
 * token CSS; server / Google-Calendar / today-task concerns removed. Runs off
 * local state (or a host-provided controller).
 */
export function Calendar({
  language = 'ko',
  controller,
  initialEvents,
  initialCategories,
  initialDate,
  initialView = 'month',
  holidays = [],
  className,
}: CalendarProps): ReactNode {
  const internal = useCalendar({ initialEvents, initialCategories });
  const ctrl = controller ?? internal;
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    setEvents,
    canUndo,
    canRedo,
    undo,
    redo,
    categories,
    selectedCategoryIds,
    toggleCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = ctrl;

  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date());
  const [viewType, setViewType] = useState<ViewType>(initialView);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [previewEvent, setPreviewEvent] = useState<PreviewEvent | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultStart, setDefaultStart] = useState('09:00');
  const [defaultEnd, setDefaultEnd] = useState('10:00');
  const instanceDateRef = useRef<Date | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [moveScope, setMoveScope] = useState<DeleteType>('this');

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) => e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  const previousPeriod = () => setCurrentDate(getPreviousPeriodDate(currentDate, viewType));
  const nextPeriod = () => setCurrentDate(getNextPeriodDate(currentDate, viewType));
  // stable identity: the global-shortcut effect below depends on it, and a
  // per-render function would re-subscribe the keydown listener every render
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const headerTitle = useMemo(() => {
    const y = currentDate.getFullYear();
    const mn = monthNames[language] ?? (monthNames.en as string[]);
    const mon = (d: Date) => mn[d.getMonth()] ?? '';
    if (viewType === 'year') return `${y}`;
    if (viewType === 'day') {
      return pick(
        language,
        `${y}년 ${mon(currentDate)} ${currentDate.getDate()}일`,
        `${mon(currentDate)} ${currentDate.getDate()}, ${y}`,
      );
    }
    if (viewType === 'week') {
      const wd = getWeekDays(currentDate);
      const s = wd[0] ?? currentDate;
      const e = wd[6] ?? currentDate;
      return pick(
        language,
        `${mon(s)} ${s.getDate()}일 - ${mon(e)} ${e.getDate()}일`,
        `${mon(s)} ${s.getDate()} - ${mon(e)} ${e.getDate()}, ${y}`,
      );
    }
    return pick(language, `${y}년 ${mon(currentDate)}`, `${mon(currentDate)} ${y}`);
  }, [currentDate, viewType, language]);

  // ⌘Z / ⌘⇧Z (or Ctrl) undo/redo, plus single-key shortcuts (t/m/w/d/y) —
  // all disabled while typing in the modal/search box or with the event
  // modal open, so they don't fight native text-field editing
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && /^(input|textarea)$/i.test(target.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (typing || e.metaKey || e.ctrlKey || e.altKey || modalOpen) return;
      switch (e.key.toLowerCase()) {
        case 't':
          goToToday();
          break;
        case 'm':
          setViewType('month');
          break;
        case 'w':
          setViewType('week');
          break;
        case 'd':
          setViewType('day');
          break;
        case 'y':
          setViewType('year');
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // setViewType is a useState setter — stable, so it isn't a dependency
  }, [undo, redo, modalOpen, goToToday]);

  /** drag-to-move an event chip/bar onto a different day (month view); for a
   * recurring event/instance this defers to the scope dialog instead of
   * committing straight away */
  const handleEventMove = (event: CalendarEvent, newDate: Date) => {
    const deltaDays = Math.round(
      (startOfDay(newDate).getTime() - startOfDay(event.date).getTime()) / 86_400_000,
    );
    if (deltaDays === 0) return;
    const shift = (d: Date) =>
      new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate() + deltaDays,
        d.getHours(),
        d.getMinutes(),
      );

    if (event.recurrence || event.isRecurringInstance) {
      const master = event.isRecurringInstance
        ? (events.find((e) => e.id === event.recurringEventId) ?? event)
        : event;
      setMoveScope('this');
      setPendingMove({ master, instanceDate: event.date, newDate: shift(event.date) });
      return;
    }

    updateEvent(event.id, {
      date: shift(event.date),
      endDate: event.endDate ? shift(event.endDate) : undefined,
    });
  };

  /** drag a period bar's start/end edge (month view) onto another day to resize it */
  const handleEventResize = (event: CalendarEvent, edge: 'start' | 'end', newDate: Date) => {
    const onDay = (base: Date, day: Date) =>
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        base.getHours(),
        base.getMinutes(),
      );
    if (edge === 'start') {
      const end = event.endDate ?? event.date;
      if (startOfDay(newDate) > startOfDay(end)) return; // can't push start past the end
      updateEvent(event.id, { date: onDay(event.date, newDate) });
    } else {
      if (startOfDay(newDate) < startOfDay(event.date)) return; // can't pull end before the start
      updateEvent(event.id, { endDate: onDay(event.endDate ?? event.date, newDate) });
    }
  };

  const openCreate = (date: Date, endDate: Date | null, hour?: number) => {
    setSelectedEvent(null);
    instanceDateRef.current = null;
    setSelectedDate(date);
    setSelectedEndDate(endDate);
    if (hour != null) {
      setDefaultStart(`${String(hour).padStart(2, '0')}:00`);
      setDefaultEnd(`${String(Math.min(23, hour + 1)).padStart(2, '0')}:00`);
    } else {
      const s = getNextAvailableTime(date, events);
      const sh = Number.parseInt(s.split(':')[0] ?? '9', 10);
      setDefaultStart(s);
      setDefaultEnd(`${String(Math.min(23, sh + 1)).padStart(2, '0')}:00`);
    }
    setModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    const master = event.isRecurringInstance
      ? (events.find((e) => e.id === event.recurringEventId) ?? event)
      : event;
    instanceDateRef.current = event.date;
    setSelectedEvent(master);
    setSelectedDate(master.date);
    setSelectedEndDate(master.endDate ?? null);
    setModalOpen(true);
  };

  const handleAddEventClick = (date: Date, hour?: number) => openCreate(date, null, hour);
  const handleRangeSelect = (start: Date, end: Date) => openCreate(start, end);

  /** drag an empty week/day timegrid area (week/day views) into a timed create */
  const handleTimeRangeSelect = (date: Date, startMin: number, endMin: number) => {
    setSelectedEvent(null);
    instanceDateRef.current = null;
    setSelectedDate(date);
    setSelectedEndDate(null);
    setDefaultStart(minutesToHHMM(startMin));
    setDefaultEnd(minutesToHHMM(endMin));
    setModalOpen(true);
  };

  /** drag/resize a timed event in week/day view onto a new start/end time;
   * `newDate` is set only when a week-view drag also moved the event to a
   * different day column. Recurring events/instances defer to the scope
   * dialog instead of committing straight away (resize is blocked for them
   * upstream in WeekView/DayView, so this only ever sees a move here). */
  const handleEventTimeChange = (
    event: CalendarEvent,
    startMin: number,
    endMin: number,
    newDate?: Date,
  ) => {
    if (event.recurrence || event.isRecurringInstance) {
      const master = event.isRecurringInstance
        ? (events.find((e) => e.id === event.recurringEventId) ?? event)
        : event;
      const resolvedDate = newDate
        ? new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
        : startOfDay(event.date);
      setMoveScope('this');
      setPendingMove({
        master,
        instanceDate: event.date,
        newDate: resolvedDate,
        newStartTime: minutesToHHMM(startMin),
        newEndTime: minutesToHHMM(endMin),
      });
      return;
    }

    const patch: Partial<CalendarEvent> = {
      startTime: minutesToHHMM(startMin),
      endTime: minutesToHHMM(endMin),
    };
    if (newDate)
      patch.date = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    updateEvent(event.id, patch);
  };

  const handleSave = (data: EventSaveData) => {
    const base: Omit<CalendarEvent, 'id'> = {
      title: data.title,
      date: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      description: data.description,
      categoryId: data.categoryId,
      recurrence: data.recurrence,
    };
    if (selectedEvent) updateEvent(selectedEvent.id, base);
    else addEvent(base);
    setPreviewEvent(null);
  };

  const handleDelete = (deleteType: DeleteType) => {
    if (!selectedEvent) return;
    const master = selectedEvent;
    const instanceDate = instanceDateRef.current;
    if (!master.recurrence || deleteType === 'all') {
      deleteEvent(master.id);
    } else if (deleteType === 'this' && instanceDate) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === master.id ? { ...e, exdate: [...(e.exdate ?? []), instanceDate] } : e,
        ),
      );
    } else if (deleteType === 'following' && instanceDate) {
      const until = startOfDay(instanceDate);
      until.setDate(until.getDate() - 1);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === master.id && e.recurrence ? { ...e, recurrence: { ...e.recurrence, until } } : e,
        ),
      );
    }
    setPreviewEvent(null);
  };

  /** apply a pending recurring-event move once the user has picked a scope
   * ('this' occurrence only / 'this and following' / 'all') */
  const handleRecurrenceScopeConfirm = () => {
    if (!pendingMove) return;
    const { master, instanceDate, newDate, newStartTime, newEndTime } = pendingMove;

    if (moveScope === 'all' || !master.recurrence) {
      const deltaDays = Math.round(
        (startOfDay(newDate).getTime() - startOfDay(instanceDate).getTime()) / 86_400_000,
      );
      const shift = (d: Date) =>
        new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate() + deltaDays,
          d.getHours(),
          d.getMinutes(),
        );
      updateEvent(master.id, {
        date: shift(master.date),
        endDate: master.endDate ? shift(master.endDate) : undefined,
        startTime: newStartTime ?? master.startTime,
        endTime: newEndTime ?? master.endTime,
      });
    } else if (moveScope === 'this') {
      // a single setEvents call so the exclusion + the new standalone event
      // land as one undo step, matching handleDelete's granularity
      setEvents((prev) => [
        ...prev.map((e) =>
          e.id === master.id ? { ...e, exdate: [...(e.exdate ?? []), instanceDate] } : e,
        ),
        {
          id: `${master.id}-moved-${instanceDate.getTime()}`,
          title: master.title,
          date: newDate,
          startTime: newStartTime ?? master.startTime,
          endTime: newEndTime ?? master.endTime,
          description: master.description,
          categoryId: master.categoryId,
        },
      ]);
    } else if (moveScope === 'following' && master.recurrence) {
      const recurrence = master.recurrence;
      const until = startOfDay(instanceDate);
      until.setDate(until.getDate() - 1);
      const elapsed = occurrencesInRange(master.date, recurrence, master.date, until).length;
      const remainingCount =
        recurrence.count != null ? Math.max(1, recurrence.count - elapsed) : undefined;
      setEvents((prev) => [
        ...prev.map((e) =>
          e.id === master.id && e.recurrence ? { ...e, recurrence: { ...e.recurrence, until } } : e,
        ),
        {
          id: `${master.id}-split-${instanceDate.getTime()}`,
          title: master.title,
          date: newDate,
          startTime: newStartTime ?? master.startTime,
          endTime: newEndTime ?? master.endTime,
          description: master.description,
          categoryId: master.categoryId,
          recurrence: { ...recurrence, count: remainingCount },
        },
      ]);
    }

    setPendingMove(null);
  };

  const handleRecurrenceScopeCancel = () => setPendingMove(null);

  const viewOptions: { value: ViewType; label: string }[] = [
    { value: 'day', label: pick(language, '일간', 'Day') },
    { value: 'week', label: pick(language, '주간', 'Week') },
    { value: 'month', label: pick(language, '월간', 'Month') },
    { value: 'year', label: pick(language, '연간', 'Year') },
  ];

  return (
    <div className={className ? `sft-cal ${className}` : 'sft-cal'}>
      <div className="sft-cal__toolbar">
        <div className="sft-cal__toolbar-left">
          <h2 className="sft-cal__title">{headerTitle}</h2>
          <div className="sft-cal__nav">
            <button
              type="button"
              className="sft-cal__navbtn"
              aria-label="previous"
              onClick={previousPeriod}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="sft-cal__navbtn"
              aria-label="next"
              onClick={nextPeriod}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            className="sft-cal-btn sft-cal-btn--outline sft-cal-btn--sm"
            onClick={goToToday}
          >
            {pick(language, '오늘', 'Today')}
          </button>
          <div className="sft-cal__nav">
            <button
              type="button"
              className="sft-cal__navbtn"
              aria-label={pick(language, '실행 취소', 'Undo')}
              title={pick(language, '실행 취소 (⌘Z)', 'Undo (⌘Z)')}
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              type="button"
              className="sft-cal__navbtn"
              aria-label={pick(language, '다시 실행', 'Redo')}
              title={pick(language, '다시 실행 (⌘⇧Z)', 'Redo (⌘⇧Z)')}
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
          </div>
          <div className="sft-cal__search">
            {showSearch ? (
              <div className="sft-cal__searchbox">
                <Search size={14} className="sft-cal__searchicon" />
                <input
                  ref={searchRef}
                  className="sft-cal__searchinput"
                  placeholder={pick(language, '일정 검색...', 'Search events...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setShowSearch(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="sft-cal__searchclose"
                  aria-label="close search"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="sft-cal__navbtn"
                aria-label="search"
                onClick={() => {
                  setShowSearch(true);
                  setTimeout(() => searchRef.current?.focus(), 30);
                }}
              >
                <Search size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="sft-cal__toolbar-right">
          <CategoryFilter
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            language={language}
            onToggle={toggleCategory}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
            onReorder={reorderCategories}
          />
          <SegmentTabs value={viewType} onValueChange={setViewType} options={viewOptions} />
        </div>
      </div>

      <div className="sft-cal__view">
        {viewType === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            selectedCategoryIds={selectedCategoryIds}
            categories={categories}
            language={language}
            holidays={holidays}
            selectedEvent={selectedEvent}
            previewEvent={modalOpen ? previewEvent : null}
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
            onEventClick={handleEventClick}
            onAddEventClick={handleAddEventClick}
            onRangeSelect={handleRangeSelect}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
          />
        )}
        {viewType === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            selectedCategoryIds={selectedCategoryIds}
            categories={categories}
            language={language}
            selectedEvent={selectedEvent}
            previewEvent={modalOpen ? previewEvent : null}
            onEventClick={handleEventClick}
            onAddEventClick={handleAddEventClick}
            onTimeRangeSelect={handleTimeRangeSelect}
            onEventTimeChange={handleEventTimeChange}
          />
        )}
        {viewType === 'day' && (
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            selectedCategoryIds={selectedCategoryIds}
            categories={categories}
            language={language}
            selectedEvent={selectedEvent}
            previewEvent={modalOpen ? previewEvent : null}
            onEventClick={handleEventClick}
            onAddEventClick={handleAddEventClick}
            onTimeRangeSelect={handleTimeRangeSelect}
            onEventTimeChange={handleEventTimeChange}
          />
        )}
        {viewType === 'year' && (
          <YearView
            currentDate={currentDate}
            events={filteredEvents}
            selectedCategoryIds={selectedCategoryIds}
            categories={categories}
            language={language}
            onDateClick={setCurrentDate}
            onViewChange={setViewType}
          />
        )}
      </div>

      <EventModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) {
            setSelectedEvent(null);
            setPreviewEvent(null);
          }
        }}
        event={selectedEvent}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        defaultStartTime={defaultStart}
        defaultEndTime={defaultEnd}
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        language={language}
        onSave={handleSave}
        onDelete={selectedEvent ? handleDelete : undefined}
        onChange={setPreviewEvent}
        onToggleCategory={toggleCategory}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onReorderCategories={reorderCategories}
      />

      {pendingMove && (
        <RecurrenceScopeDialog
          language={language}
          selectedScope={moveScope}
          setSelectedScope={setMoveScope}
          onCancel={handleRecurrenceScopeCancel}
          onConfirm={handleRecurrenceScopeConfirm}
        />
      )}
    </div>
  );
}
