import type { Locale } from './i18n';

export type PageKey = 'overview' | 'table' | 'button';

export interface NavItem {
  key: PageKey;
  icon: string;
  ko: string;
  en: string;
}

export interface NavGroup {
  section: 'start' | 'components';
  items: NavItem[];
}

export const nav: NavGroup[] = [
  {
    section: 'start',
    items: [{ key: 'overview', icon: '◇', ko: '개요', en: 'Overview' }],
  },
  {
    section: 'components',
    items: [
      { key: 'table', icon: '▦', ko: '데이터 테이블', en: 'Data Table' },
      { key: 'button', icon: '⬡', ko: 'Button', en: 'Button' },
    ],
  },
];

export function navLabel(item: NavItem, locale: Locale): string {
  return locale === 'ko' ? item.ko : item.en;
}
