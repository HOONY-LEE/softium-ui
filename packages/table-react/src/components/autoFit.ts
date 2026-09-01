/**
 * Column auto-fit: measure the widest rendered content for a column and return the
 * width that would show it in full. Shared by the resize handle's double-click and
 * the column menu's "autosize" items, so both agree on the resulting width.
 *
 * Only *rendered* cells are measured — with virtualization on, that is the visible
 * window rather than the whole dataset, which is the same tradeoff ag-Grid makes.
 */

/** floor for any resize, matching the drag handle's own minimum */
export const MIN_RESIZE_WIDTH = 48;

/** ceiling used when a column declares no `maxWidth` */
export const DEFAULT_MAX_FIT_WIDTH = 480;

/** horizontal cell padding (2 × 12px) plus room for the sort glyph and menu button */
const CONTENT_PADDING = 32;

function escapeKey(key: string): string {
  return typeof window !== 'undefined' && window.CSS?.escape ? window.CSS.escape(key) : key;
}

/**
 * Widest rendered content (px) for one column, or null when nothing is measurable
 * (e.g. the column is scrolled out of a virtualized window and has no header text).
 */
export function measureColumnContent(root: Element, columnKey: string): number | null {
  const key = escapeKey(columnKey);
  let widest = 0;

  const head = root.querySelector(`.sft-th[data-col-key="${key}"] .sft-th__text`);
  if (head instanceof HTMLElement) widest = head.scrollWidth;

  for (const el of root.querySelectorAll(`.sft-td[data-col-key="${key}"] .sft-td__content`)) {
    if (el instanceof HTMLElement) widest = Math.max(widest, el.scrollWidth);
  }

  return widest === 0 ? null : widest;
}

/**
 * The fitted width for one column, clamped to its min/max. Returns null when there
 * is nothing to measure, so callers can skip the resize entirely.
 */
export function fitColumnWidth(
  root: Element,
  columnKey: string,
  bounds: { minWidth?: number; maxWidth?: number } = {},
): number | null {
  const widest = measureColumnContent(root, columnKey);
  if (widest === null) return null;
  const min = bounds.minWidth ?? MIN_RESIZE_WIDTH;
  const max = bounds.maxWidth ?? DEFAULT_MAX_FIT_WIDTH;
  return Math.min(max, Math.max(min, Math.ceil(widest + CONTENT_PADDING)));
}
