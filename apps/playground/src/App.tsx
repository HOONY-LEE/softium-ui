import { Table, useTable } from '@softium/table-react';
import { useEffect, useMemo, useState } from 'react';
import { type Employee, employeeColumns, makeEmployees } from './data';

/**
 * Phase 2 playground — a real <Table /> rendered from dummy ERP data, wired to the
 * three cross-cutting concerns from day one: theme (token swap), i18n (the table's
 * own UI strings switch with `locale`), and responsive layout.
 */

type Locale = 'ko' | 'en';
type Theme = 'light' | 'dark';

const i18n = {
  ko: {
    badge: 'Phase 3 · 컬럼 조작',
    title: 'softium-ui',
    subtitle: 'ERP 화면 전용 React 테이블 라이브러리',
    tableTitle: '사원 테이블',
    tableNote: '아래 한 줄로 렌더됩니다: <Table table={table} />',
    theme: '테마',
    rowsLabel: '행 수',
    roadmapTitle: '빌드 로드맵',
  },
  en: {
    badge: 'Phase 3 · column ops',
    title: 'softium-ui',
    subtitle: 'A React table library built for ERP screens',
    tableTitle: 'Employees',
    tableNote: 'Rendered by one line: <Table table={table} />',
    theme: 'Theme',
    rowsLabel: 'Rows',
    roadmapTitle: 'Build roadmap',
  },
} satisfies Record<Locale, Record<string, string>>;

const roadmap: { phase: string; ko: string; en: string; done: boolean }[] = [
  { phase: '0', ko: '모노레포 스캐폴드', en: 'Monorepo scaffold', done: true },
  { phase: '1', ko: 'headless core', en: 'Headless core', done: true },
  { phase: '2', ko: '기본 렌더링', en: 'Basic rendering', done: true },
  {
    phase: '3',
    ko: '컬럼 조작 (DnD · 핀 · 리사이즈)',
    en: 'Column ops (DnD · pin · resize)',
    done: true,
  },
  { phase: '4', ko: '정렬 · 필터 · 검색', en: 'Sort · filter · search', done: false },
  { phase: '5', ko: '행 가상화 (1만 행)', en: 'Row virtualization (10k rows)', done: false },
  { phase: '6', ko: '선택 · 페이지네이션', en: 'Selection · pagination', done: false },
  { phase: '7', ko: '영속화 · 테마', en: 'Persistence · theming', done: false },
];

const ROW_OPTIONS = [10, 50, 200];

export function App() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [theme, setTheme] = useState<Theme>('light');
  const [rowCount, setRowCount] = useState(10);
  const t = i18n[locale];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.lang = locale;
  }, [theme, locale]);

  const data = useMemo<Employee[]>(() => makeEmployees(rowCount), [rowCount]);
  const table = useTable({ data, columns: employeeColumns, getRowId: (r) => r.id });

  return (
    <div className="page">
      <header className="topbar">
        <span className="badge">{t.badge}</span>
        <div className="controls">
          <fieldset className="segmented" aria-label="language">
            <button type="button" data-active={locale === 'ko'} onClick={() => setLocale('ko')}>
              한국어
            </button>
            <button type="button" data-active={locale === 'en'} onClick={() => setLocale('en')}>
              EN
            </button>
          </fieldset>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setTheme((v) => (v === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? '🌙' : '☀︎'} {t.theme}
          </button>
        </div>
      </header>

      <main className="hero">
        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </main>

      <section className="card">
        <div className="card-head">
          <h2>{t.tableTitle}</h2>
          <fieldset className="segmented" aria-label={t.rowsLabel}>
            {ROW_OPTIONS.map((n) => (
              <button
                type="button"
                key={n}
                data-active={rowCount === n}
                onClick={() => setRowCount(n)}
              >
                {n}
              </button>
            ))}
          </fieldset>
        </div>
        <Table table={table} locale={locale} />
        <p className="code-note">
          <code>{t.tableNote}</code>
        </p>
      </section>

      <section className="card">
        <h2>{t.roadmapTitle}</h2>
        <ul className="roadmap">
          {roadmap.map((r) => (
            <li key={r.phase} data-done={r.done}>
              <span className="dot" aria-hidden="true" />
              <span className="phase">Phase {r.phase}</span>
              <span className="label">{locale === 'ko' ? r.ko : r.en}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
