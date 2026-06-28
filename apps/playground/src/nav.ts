import { LayoutDashboard, LayoutGrid, type LucideIcon, Square, Table } from 'lucide-react';
import type { Locale } from './i18n';

export type PageKey = 'overview' | 'table' | 'cell-types' | 'button';

export interface NavItem {
  key: PageKey;
  icon: LucideIcon;
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
    items: [{ key: 'overview', icon: LayoutDashboard, ko: '개요', en: 'Overview' }],
  },
  {
    section: 'components',
    items: [
      { key: 'table', icon: Table, ko: '데이터 테이블', en: 'Data Table' },
      { key: 'cell-types', icon: LayoutGrid, ko: '셀 타입', en: 'Cell Types' },
      { key: 'button', icon: Square, ko: 'Button', en: 'Button' },
    ],
  },
];

export function navLabel(item: NavItem, locale: Locale): string {
  return locale === 'ko' ? item.ko : item.en;
}
