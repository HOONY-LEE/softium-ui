import { Check, Copy, ExternalLink, Github, Package, Sparkles } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { Locale } from '../i18n';
import type { PageKey } from '../nav';

interface OverviewPageProps {
  locale: Locale;
  onNavigate: (page: PageKey) => void;
}

const INSTALL_CMD = 'npm i softium-ui';

const hero = {
  ko: {
    title: 'ERP 화면을 위한 React UI 라이브러리',
    lead: 'Table부터 수식 엔진을 내장한 스프레드시트(Sheet), 반복 일정을 지원하는 Calendar, 반응형 앱 셸까지 — 패키지 하나, import 한 줄로 씁니다. 토큰 기반 테마라 다크모드가 기본 포함이고, 모든 컴포넌트가 완전한 TypeScript 타입을 가지고 있습니다.',
    installLabel: '설치',
    quickstartLabel: '바로 시작',
    npmLink: 'npm에서 보기',
    githubLink: 'GitHub 저장소',
  },
  en: {
    title: 'A React UI library for ERP screens',
    lead: 'From Table to a spreadsheet with a built-in formula engine (Sheet), a Calendar with recurring events, and a responsive app shell — one package, one import. Token-driven theming ships dark mode for free, and every component carries full TypeScript types.',
    installLabel: 'Install',
    quickstartLabel: 'Quickstart',
    npmLink: 'View on npm',
    githubLink: 'GitHub repo',
  },
} satisfies Record<Locale, Record<string, string>>;

const QUICKSTART = `import 'softium-ui/styles.css';
import { Table, Sheet, Calendar, Button, useTable } from 'softium-ui';`;

interface AiPoint {
  ko: { title: string; desc: string };
  en: { title: string; desc: string };
}

const aiCopy = {
  ko: {
    heading: 'AI 코딩 어시스턴트를 위해 설계했습니다',
    lead: 'Claude, Cursor 같은 AI 코딩 도구가 이 라이브러리로 작업할 때 추측 없이 정확한 코드를 생성하도록 만들었습니다 — 사람이 쓰기 좋은 API는 AI에게도 좋은 API입니다.',
  },
  en: {
    heading: 'Built with AI coding assistants in mind',
    lead: "Designed so tools like Claude or Cursor can generate correct code on the first try, with less guessing — an API that's good for humans is good for AI too.",
  },
} satisfies Record<Locale, { heading: string; lead: string }>;

const aiPoints: AiPoint[] = [
  {
    ko: {
      title: '패키지 하나, import 하나',
      desc: '`softium-ui` 하나만 알면 됩니다. 여러 패키지를 오가며 어디서 뭘 가져올지 추측할 필요가 없습니다.',
    },
    en: {
      title: 'One package, one import',
      desc: 'Just `softium-ui`. No guessing which of several packages a component comes from.',
    },
  },
  {
    ko: {
      title: '엄격 모드 TypeScript 전체 적용',
      desc: '모든 컴포넌트가 정확한 .d.ts를 가지고 있어, 실제 타입을 근거로 코드가 생성됩니다 — 추측이 아니라 확인입니다.',
    },
    en: {
      title: 'Strict TypeScript, everywhere',
      desc: 'Every component ships accurate .d.ts files, so generated code is grounded in real types instead of guesses.',
    },
  },
  {
    ko: {
      title: '컴포넌트 간 동일한 prop 패턴',
      desc: 'Table · DataGrid · Pivot이 전부 같은 `{ key, label }` 컬럼 정의를 씁니다. 하나를 알면 나머지도 그대로 통합니다.',
    },
    en: {
      title: 'Consistent prop shapes across components',
      desc: 'Table, DataGrid, and Pivot all share the same `{ key, label }` column definition. Learn one, use them all.',
    },
  },
  {
    ko: {
      title: '설정 없이 바로 동작',
      desc: 'Provider로 감싸거나 전역 설정을 할 필요가 없습니다. 컴포넌트를 가져와서 props만 넘기면 그대로 동작합니다.',
    },
    en: {
      title: 'Zero-config usage',
      desc: 'No wrapping providers, no global setup. Import a component, pass props, done.',
    },
  },
  {
    ko: {
      title: '실제로 검증된 예제',
      desc: '각 패키지 README의 코드는 npm에 배포된 실제 패키지를 새 프로젝트에 설치해 typecheck·빌드까지 확인한 스니펫입니다.',
    },
    en: {
      title: 'Examples verified against the published package',
      desc: 'Every README snippet was checked by installing the real, published package into a fresh project and running typecheck + build.',
    },
  },
  {
    ko: {
      title: '순수 CSS 토큰, 하드코딩 클래스 없음',
      desc: 'Tailwind 조합을 외우거나 추측할 필요 없이, `--sft-*` 변수 몇 개로 테마가 결정됩니다. 다크모드도 자동입니다.',
    },
    en: {
      title: 'Plain CSS tokens, no class soup',
      desc: 'No Tailwind combinations to memorize or guess — a handful of `--sft-*` variables drive theming, dark mode included.',
    },
  },
];

interface Card {
  key: PageKey;
  pkg: string;
  status: 'stable' | 'seed';
  ko: { title: string; desc: string };
  en: { title: string; desc: string };
}

const cards: Card[] = [
  {
    key: 'table',
    pkg: '@softium/table-react',
    status: 'stable',
    ko: {
      title: '데이터 테이블',
      desc: '서버 데이터 무엇이든 · 엑셀처럼 컬럼 조작 · 정렬·필터·검색·가상 스크롤 내장',
    },
    en: {
      title: 'Data Table',
      desc: 'Any server payload · spreadsheet-grade column ops · sort/filter/search/virtualization built in',
    },
  },
  {
    key: 'data-grid',
    pkg: '@softium/table-react',
    status: 'stable',
    ko: { title: '데이터 그리드', desc: '더블클릭 인라인 편집이 되는 Table의 편집 가능 버전' },
    en: { title: 'Data Grid', desc: 'The editable variant of Table — double-click to edit inline' },
  },
  {
    key: 'sheet',
    pkg: '@softium/sheet',
    status: 'stable',
    ko: {
      title: '시트',
      desc: 'A1 주소 · 수식 엔진(SUM·IF·VLOOKUP 등) · 여러 시트 탭 · 서식·클립보드 지원',
    },
    en: {
      title: 'Sheet',
      desc: 'A1-addressed grid · formula engine (SUM/IF/VLOOKUP…) · multi-sheet tabs · formatting & clipboard',
    },
  },
  {
    key: 'pivot',
    pkg: '@softium/table-react',
    status: 'stable',
    ko: { title: '피벗', desc: '행·열·값 필드를 드래그로 재배치하는 크로스탭 요약 테이블' },
    en: { title: 'Pivot', desc: 'A cross-tab summary table — drag rows/columns/values to reshape' },
  },
  {
    key: 'cell-types',
    pkg: '@softium/table-react',
    status: 'stable',
    ko: { title: '셀 타입', desc: '아바타·칩·게이지·전화번호 등 미리 만들어진 셀 렌더러 모음' },
    en: {
      title: 'Cell Types',
      desc: 'Ready-made cell renderers — avatar, chip, gauge, phone, and more',
    },
  },
  {
    key: 'calendar',
    pkg: '@softium/calendar',
    status: 'stable',
    ko: {
      title: '캘린더',
      desc: '월/주/일/연간 뷰 · 드래그로 일정 생성·이동 · 반복 일정 · undo/redo',
    },
    en: {
      title: 'Calendar',
      desc: 'Month/week/day/year views · drag to create or move events · recurrence · undo/redo',
    },
  },
  {
    key: 'layout',
    pkg: '@softium/ui',
    status: 'stable',
    ko: {
      title: '레이아웃',
      desc: '사이드바·헤더가 있는 반응형 앱 셸 — 모바일에서는 드로어로 전환',
    },
    en: {
      title: 'Layout',
      desc: 'A responsive app shell with sidebar + header — collapses to a drawer on mobile',
    },
  },
  {
    key: 'button',
    pkg: '@softium/ui',
    status: 'seed',
    ko: { title: 'Button', desc: '먼저 시드한 단 하나의 프리미티브' },
    en: { title: 'Button', desc: 'The single primitive seeded up front' },
  },
];

function InstallSnippet({ locale }: { locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const t = hero[locale];

  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable (insecure context) — no-op
    }
  }

  return (
    <div className="overview-install" aria-label={t.installLabel}>
      <span className="overview-install__cmd">
        <span className="overview-install__prompt" aria-hidden="true">
          $
        </span>
        {INSTALL_CMD}
      </span>
      <button
        type="button"
        className="overview-install__copy"
        data-copied={copied || undefined}
        title="copy"
        aria-label="copy install command"
        onClick={copy}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sft-space-3)' }}>
      <h2 className="overview-section-title">{title}</h2>
      {children}
    </div>
  );
}

export function OverviewPage({ locale, onNavigate }: OverviewPageProps) {
  const t = hero[locale];
  const ai = aiCopy[locale];

  return (
    <div className="page-body">
      <div className="overview-hero">
        <span className="overview-eyebrow">softium-ui</span>
        <h1 className="overview-title">{t.title}</h1>
        <p className="overview-lead">{t.lead}</p>

        <InstallSnippet locale={locale} />

        <div className="overview-links">
          <a
            className="overview-link overview-link--primary"
            href="https://www.npmjs.com/package/softium-ui"
            target="_blank"
            rel="noreferrer"
          >
            <Package size={15} />
            {t.npmLink}
            <ExternalLink size={13} />
          </a>
          <a
            className="overview-link"
            href="https://github.com/HOONY-LEE/softium-ui"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={15} />
            {t.githubLink}
          </a>
        </div>
      </div>

      <div className="overview-ai">
        <h2 className="overview-ai__heading">
          <Sparkles size={18} />
          {ai.heading}
        </h2>
        <p className="overview-ai__lead">{ai.lead}</p>
        <ul className="overview-ai__grid">
          {aiPoints.map((p) => {
            const pt = locale === 'ko' ? p.ko : p.en;
            return (
              <li className="overview-ai__item" key={pt.title}>
                <Check size={16} className="overview-ai__item-icon" aria-hidden="true" />
                <span>
                  <span className="overview-ai__item-title">{pt.title}</span>
                  <span className="overview-ai__item-desc">{pt.desc}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <Section title={t.quickstartLabel}>
        <pre className="overview-install" style={{ maxWidth: 560, cursor: 'default' }}>
          <code className="overview-install__cmd" style={{ whiteSpace: 'pre' }}>
            {QUICKSTART}
          </code>
        </pre>
      </Section>

      <div className="overview-grid">
        {cards.map((c) => {
          const ct = locale === 'ko' ? c.ko : c.en;
          return (
            <button
              type="button"
              key={c.key}
              className="overview-card"
              onClick={() => onNavigate(c.key)}
            >
              <span className={`overview-card__badge overview-card__badge--${c.status}`}>
                {c.status}
              </span>
              <span className="overview-card__title">{ct.title}</span>
              <span className="overview-card__pkg">{c.pkg}</span>
              <span className="overview-card__desc">{ct.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
