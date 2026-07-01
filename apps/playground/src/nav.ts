import {
  Grid2x2,
  Grid3x3,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  PanelsTopLeft,
  Sigma,
  Square,
  Table,
} from 'lucide-react';
import type { Locale } from './i18n';

export type PageKey =
  | 'overview'
  | 'table'
  | 'data-grid'
  | 'sheet'
  | 'pivot'
  | 'cell-types'
  | 'layout'
  | 'button';

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
      { key: 'data-grid', icon: Grid3x3, ko: '데이터 그리드', en: 'Data Grid' },
      { key: 'sheet', icon: Grid2x2, ko: '시트', en: 'Sheet' },
      { key: 'pivot', icon: Sigma, ko: '피벗', en: 'Pivot' },
      { key: 'cell-types', icon: LayoutGrid, ko: '셀 타입', en: 'Cell Types' },
      { key: 'layout', icon: PanelsTopLeft, ko: '레이아웃', en: 'Layout' },
      { key: 'button', icon: Square, ko: 'Button', en: 'Button' },
    ],
  },
];

export function navLabel(item: NavItem, locale: Locale): string {
  return locale === 'ko' ? item.ko : item.en;
}
