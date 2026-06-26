import { useEffect, useState } from 'react';

/**
 * Phase 0 playground.
 *
 * No Table yet — this shell proves the three cross-cutting concerns are wired
 * from the start: theme (token swap), i18n (UI strings via a locale dictionary),
 * and responsive layout (token-based, fluid). The real <Table /> mounts in Phase 2.
 */

type Locale = 'ko' | 'en';
type Theme = 'light' | 'dark';

const i18n = {
  ko: {
    badge: 'Phase 0 · 스캐폴드 완료',
    title: 'softium-ui',
    subtitle: 'ERP 화면 전용 React 테이블 라이브러리',
    intro:
      '어떤 서버 데이터가 들어와도 그릴 수 있고, 엑셀처럼 컬럼을 조작할 수 있으며, 기본 상태로도 아름다운 테이블.',
    theme: '테마',
    language: '언어',
    roadmapTitle: '빌드 로드맵',
    tokensTitle: '디자인 토큰 (테마는 이 변수만 갈아끼웁니다)',
    next: '다음 단계: Phase 1 — headless core (타입 · 어댑터 3종 · columnState 합성)',
  },
  en: {
    badge: 'Phase 0 · scaffold ready',
    title: 'softium-ui',
    subtitle: 'A React table library built for ERP screens',
    intro:
      'Render any server payload, manipulate columns like a spreadsheet, and look great out of the box.',
    theme: 'Theme',
    language: 'Language',
    roadmapTitle: 'Build roadmap',
    tokensTitle: 'Design tokens (theming only swaps these variables)',
    next: 'Next: Phase 1 — headless core (types · 3 adapters · columnState merge)',
  },
} satisfies Record<Locale, Record<string, string>>;

const roadmap: { phase: string; ko: string; en: string; done: boolean }[] = [
  { phase: '0', ko: '모노레포 스캐폴드', en: 'Monorepo scaffold', done: true },
  { phase: '1', ko: 'headless core', en: 'Headless core', done: false },
  { phase: '2', ko: '기본 렌더링', en: 'Basic rendering', done: false },
  {
    phase: '3',
    ko: '컬럼 조작 (DnD · 핀 · 리사이즈)',
    en: 'Column ops (DnD · pin · resize)',
    done: false,
  },
  { phase: '4', ko: '정렬 · 필터 · 검색', en: 'Sort · filter · search', done: false },
  { phase: '5', ko: '행 가상화 (1만 행)', en: 'Row virtualization (10k rows)', done: false },
  { phase: '6', ko: '선택 · 페이지네이션', en: 'Selection · pagination', done: false },
  { phase: '7', ko: '영속화 · 테마', en: 'Persistence · theming', done: false },
];

const swatches = [
  '--sft-color-accent',
  '--sft-color-bg',
  '--sft-color-bg-subtle',
  '--sft-color-surface',
  '--sft-color-border',
  '--sft-color-text',
  '--sft-color-success',
  '--sft-color-warning',
  '--sft-color-danger',
];

export function App() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [theme, setTheme] = useState<Theme>('light');
  const t = i18n[locale];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.lang = locale;
  }, [theme, locale]);

  return (
    <div className="page">
      <header className="topbar">
        <span className="badge">{t.badge}</span>
        <div className="controls">
          <fieldset className="segmented" aria-label={t.language}>
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
        <p className="intro">{t.intro}</p>
      </main>

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

      <section className="card">
        <h2>{t.tokensTitle}</h2>
        <div className="swatches">
          {swatches.map((name) => (
            <div className="swatch" key={name}>
              <span className="chip" style={{ background: `var(${name})` }} />
              <code>{name}</code>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">{t.next}</footer>
    </div>
  );
}
