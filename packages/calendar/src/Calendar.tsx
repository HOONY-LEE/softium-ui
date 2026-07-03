import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { CategoryFilter } from './components/CategoryFilter';
import type { DeleteType } from './components/DeleteOptionsDialog';
import { EventModal, type EventSaveData } from './components/EventModal';
import { SegmentTabs } from './components/SegmentTabs';
import { type CalendarController, useCalendar } from './hooks/useCalendar';
import { pick } from './i18n';
import type { CalendarEvent, Category, PreviewEvent, ViewType } from './types';
import { getNextPeriodDate, getPreviousPeriodDate, getWeekDays, monthNames } from './utils/date';
import { getNextAvailableTime } from './utils/events';
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
  className?: string;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) => e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  const previousPeriod = () => setCurrentDate(getPreviousPeriodDate(currentDate, viewType));
  const nextPeriod = () => setCurrentDate(getNextPeriodDate(currentDate, viewType));
  const goToToday = () => setCurrentDate(new Date());

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
            selectedEvent={selectedEvent}
            previewEvent={modalOpen ? previewEvent : null}
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
            onEventClick={handleEventClick}
            onAddEventClick={handleAddEventClick}
            onRangeSelect={handleRangeSelect}
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
    </div>
  );
}
