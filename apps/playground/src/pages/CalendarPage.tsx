import { Calendar, type CalendarEvent, type Category, type Holiday } from '@softium/calendar';
import { useMemo } from 'react';
import type { Locale } from '../i18n';

function seed(): { events: CalendarEvent[]; categories: Category[]; holidays: Holiday[] } {
  const categories: Category[] = [
    { id: 'personal', name: '개인', color: '#E30000' },
    { id: 'work', name: '업무', color: '#007AFF' },
    { id: 'travel', name: '여행', color: '#34C759' },
  ];

  const now = new Date();
  const at = (dayOffset: number, h = 9, m = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m);
    return d;
  };
  const hhmm = (h: number, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const events: CalendarEvent[] = [
    {
      id: 'e1',
      title: '팀 스탠드업',
      date: at(0, 10),
      startTime: hhmm(10),
      endTime: hhmm(10, 30),
      categoryId: 'work',
      recurrence: { freq: 'WEEKLY', interval: 1, byweekday: [0, 2, 4] },
    },
    {
      id: 'e2',
      title: '점심 약속',
      date: at(1, 12),
      startTime: hhmm(12),
      endTime: hhmm(13),
      categoryId: 'personal',
    },
    {
      id: 'e3',
      title: '제주 워크샵',
      date: at(2),
      endDate: at(4),
      startTime: hhmm(9),
      endTime: hhmm(18),
      categoryId: 'travel',
      description: '2박 3일 팀 워크샵',
    },
    {
      id: 'e4',
      title: '디자인 리뷰',
      date: at(0, 15),
      startTime: hhmm(15),
      endTime: hhmm(16),
      categoryId: 'work',
    },
    {
      id: 'e5',
      title: '운동',
      date: at(-1, 19),
      startTime: hhmm(19),
      endTime: hhmm(20),
      categoryId: 'personal',
      recurrence: { freq: 'DAILY', interval: 2 },
    },
  ];

  const holidays: Holiday[] = [{ date: at(6), name: '임시공휴일' }];

  return { events, categories, holidays };
}

export function CalendarPage({ locale }: { locale: Locale }) {
  const { events, categories, holidays } = useMemo(seed, []);

  return (
    <div className="page-body" style={{ height: 'calc(100vh - 120px)' }}>
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <Calendar
          language={locale}
          initialEvents={events}
          initialCategories={categories}
          holidays={holidays}
          className="playground-calendar"
        />
      </div>
    </div>
  );
}
