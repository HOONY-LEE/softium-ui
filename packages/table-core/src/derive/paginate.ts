/**
 * Pagination (SPEC §5, §6). Pure slicing over the already filtered/searched/sorted
 * data. The companion `offset` lets buildRows keep `globalIndex` dataset-absolute
 * while `displayIndex` resets per page.
 */

export function getPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Clamp a requested page into the valid 1..pageCount range. */
export function clampPage(page: number, total: number, pageSize: number): number {
  const count = getPageCount(total, pageSize);
  return Math.min(Math.max(1, Math.floor(page)), count);
}

export interface PageSlice<T> {
  /** the rows for this page */
  items: T[];
  /** number of rows preceding this page in the full set — pass to buildRows */
  offset: number;
  page: number;
  pageCount: number;
}

export function paginate<T>(data: T[], page: number, pageSize: number): PageSlice<T> {
  if (pageSize <= 0) {
    return { items: data, offset: 0, page: 1, pageCount: 1 };
  }
  const safePage = clampPage(page, data.length, pageSize);
  const offset = (safePage - 1) * pageSize;
  return {
    items: data.slice(offset, offset + pageSize),
    offset,
    page: safePage,
    pageCount: getPageCount(data.length, pageSize),
  };
}
