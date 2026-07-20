/**
 * Static configuration for the Sheet: default border spec, the toolbar's font
 * and number-format option lists, and the grid's default/minimum dimensions.
 */
import type { BorderSpec } from './types';

export const DEFAULT_BORDER: BorderSpec = {
  color: 'var(--sft-color-text)',
  width: 1,
  style: 'solid',
};

export const FONT_FAMILIES = [
  { label: '기본', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
];

export const NUM_FORMATS = [
  { label: '자동', value: undefined },
  { label: '숫자 (1,000)', value: '#,##0' },
  { label: '소수점 두 자리 (1,000.00)', value: '#,##0.00' },
  { label: '백분율 (12%)', value: '0%' },
  { label: '통화 ($1,000.00)', value: '$#,##0.00' },
];

export const DEFAULT_COL_WIDTH = 140;
export const DEFAULT_ROW_HEIGHT = 34;
export const MIN_COL_WIDTH = 48;
export const MIN_ROW_HEIGHT = 22;
/** fixed width of the row-header column */
export const ROW_HEAD_WIDTH = 48;
/** fixed height of the column-header row */
export const HEADER_HEIGHT = 34;
