/**
 * adaptPaginated — the common `{ data, total, page, pageSize }` wrapper.
 *
 *   const { data, total, page, pageSize } =
 *     adaptPaginated<Employee>(raw, { dataKey: 'data' });
 *
 * Key names are configurable for legacy ERP servers (e.g. rows/count/pageNo).
 */

import { asNumber, getProp } from './util';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdaptPaginatedOptions {
  dataKey?: string;
  totalKey?: string;
  pageKey?: string;
  pageSizeKey?: string;
}

export function adaptPaginated<T>(
  raw: unknown,
  options: AdaptPaginatedOptions = {},
): PaginatedResult<T> {
  const {
    dataKey = 'data',
    totalKey = 'total',
    pageKey = 'page',
    pageSizeKey = 'pageSize',
  } = options;

  const rawData = getProp(raw, dataKey);
  if (!Array.isArray(rawData)) {
    throw new TypeError(
      `adaptPaginated expected an array at "${dataKey}", received ${
        rawData === undefined ? 'undefined' : typeof rawData
      }.`,
    );
  }

  const data = rawData as T[];
  const total = asNumber(getProp(raw, totalKey), data.length);
  const page = asNumber(getProp(raw, pageKey), 1);
  const pageSize = asNumber(getProp(raw, pageSizeKey), data.length);

  return { data, total, page, pageSize };
}
