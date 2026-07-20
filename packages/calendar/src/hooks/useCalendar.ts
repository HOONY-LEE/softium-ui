import { useCallback, useRef, useState } from 'react';
import type { CalendarEvent, Category } from '../types';

let idSeq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

export interface UseCalendarOptions {
  initialEvents?: CalendarEvent[];
  initialCategories?: Category[];
}

export interface CalendarController {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  addEvent: (data: Omit<CalendarEvent, 'id'>) => CalendarEvent;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  /** undo/redo over event add/update/delete/move (see setEvents) */
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addCategory: (data: { name: string; color: string }) => string;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (from: number, to: number) => void;

  selectedCategoryIds: string[];
  toggleCategory: (id: string) => void;
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'personal', name: '개인', color: '#E30000' },
  { id: 'work', name: '업무', color: '#007AFF' },
  { id: 'holiday', name: '휴가', color: '#34C759' },
];

/**
 * useCalendar — self-contained local state for events + categories + the
 * category filter selection. No server/Google concerns; this is the state a
 * host would otherwise wire to its own backend.
 */
export function useCalendar(options: UseCalendarOptions = {}): CalendarController {
  const [events, setEventsRaw] = useState<CalendarEvent[]>(options.initialEvents ?? []);
  const [categories, setCategories] = useState<Category[]>(
    options.initialCategories ?? DEFAULT_CATEGORIES,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() =>
    (options.initialCategories ?? DEFAULT_CATEGORIES).map((c) => c.id),
  );

  // undo/redo: every events mutation goes through setEvents below, which
  // snapshots the pre-mutation array onto `past` and clears `future` — the
  // same pattern as the Sheet component's history stacks
  const [past, setPast] = useState<CalendarEvent[][]>([]);
  const [future, setFuture] = useState<CalendarEvent[][]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const setEvents = useCallback((updater: React.SetStateAction<CalendarEvent[]>) => {
    setPast((p) => [...p, eventsRef.current]);
    setFuture([]);
    setEventsRaw(updater);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1] as CalendarEvent[];
      setFuture((f) => [...f, eventsRef.current]);
      setEventsRaw(prev);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[f.length - 1] as CalendarEvent[];
      setPast((p) => [...p, eventsRef.current]);
      setEventsRaw(next);
      return f.slice(0, -1);
    });
  }, []);

  const addEvent = useCallback(
    (data: Omit<CalendarEvent, 'id'>) => {
      const event: CalendarEvent = { ...data, id: uid('evt') };
      setEvents((prev) => [...prev, event]);
      return event;
    },
    [setEvents],
  );

  const updateEvent = useCallback(
    (id: string, data: Partial<CalendarEvent>) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    },
    [setEvents],
  );

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [setEvents],
  );

  const addCategory = useCallback((data: { name: string; color: string }) => {
    const id = uid('cat');
    setCategories((prev) => [...prev, { id, name: data.name, color: data.color }]);
    setSelectedCategoryIds((prev) => [...prev, id]);
    return id;
  }, []);

  const updateCategory = useCallback((id: string, data: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const deleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
      setSelectedCategoryIds((prev) => prev.filter((c) => c !== id));
      setEvents((prev) => prev.filter((e) => e.categoryId !== id));
    },
    [setEvents],
  );

  const reorderCategories = useCallback((from: number, to: number) => {
    setCategories((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length)
        return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  return {
    events,
    setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    categories,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    selectedCategoryIds,
    toggleCategory,
    setSelectedCategoryIds,
  };
}
