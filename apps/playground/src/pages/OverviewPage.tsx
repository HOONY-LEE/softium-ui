import type { Locale } from '../i18n';
import type { PageKey } from '../nav';

interface OverviewPageProps {
  locale: Locale;
  onNavigate: (page: PageKey) => void;
}

const cards: {
  key: PageKey;
  ko: { title: string; desc: string };
  en: { title: string; desc: string };
  status: 'stable' | 'seed';
}[] = [
  {
    key: 'table',
    ko: {
      title: '데이터 테이블',
      desc: '서버 데이터 무엇이든 · 엑셀처럼 컬럼 조작 · 기본도 아름답게',
    },
    en: {
      title: 'Data Table',
      desc: 'Any server payload · spreadsheet-grade column ops · beautiful by default',
    },
    status: 'stable',
  },
  {
    key: 'button',
    ko: { title: 'Button', desc: '먼저 시드한 단 하나의 프리미티브' },
    en: { title: 'Button', desc: 'The single primitive seeded up front' },
    status: 'seed',
  },
];

export function OverviewPage({ locale, onNavigate }: OverviewPageProps) {
  return (
    <div className="page-body">
      <div className="overview-hero">
        <span className="overview-eyebrow">softium-ui</span>
        <h1 className="overview-title">
          {locale === 'ko'
            ? 'ERP 화면을 위한 React UI 라이브러리'
            : 'A React UI library for ERP screens'}
        </h1>
        <p className="overview-lead">
          {locale === 'ko'
            ? '토큰 기반 테마 · 완벽한 반응형 · 다국어. Table을 시작으로 컴포넌트를 넓혀갑니다.'
            : 'Token-driven theming · fully responsive · i18n. Growing outward from the Table.'}
        </p>
      </div>

      <div className="overview-grid">
        {cards.map((c) => {
          const t = locale === 'ko' ? c.ko : c.en;
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
              <span className="overview-card__title">{t.title}</span>
              <span className="overview-card__desc">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
