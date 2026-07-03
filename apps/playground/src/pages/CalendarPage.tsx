import { Calendar, type CalendarEvent, type Category } from '@softium/calendar';
import { useMemo } from 'react';
import type { Locale } from '../i18n';

function seed(): { events: CalendarEvent[]; categories: Category[] } {
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

  return { events, categories };
}

export function CalendarPage({ locale }: { locale: Locale }) {
  const { events, categories } = useMemo(seed, []);

  return (
    <div className="page-body" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">{locale === 'ko' ? '캘린더' : 'Calendar'}</h2>
          <p className="page-desc">
            {locale === 'ko'
              ? '월·주·일·연 뷰, 일정 생성/편집 모달, 카테고리, 반복 일정까지 — 토큰 CSS로 이식한 풀 캘린더. 빈 셀을 드래그해 기간 일정을 만들거나, 셀 위에서 「새 일정」을 누르세요.'
              : 'Month / week / day / year views, an event create-edit modal, categories, and recurrence — a full calendar ported to token CSS. Drag empty cells for a multi-day event, or use “New event” on hover.'}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Calendar
          language={locale}
          initialEvents={events}
          initialCategories={categories}
          className="playground-calendar"
        />
      </div>
    </div>
  );
}
