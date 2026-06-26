import { describe, expect, it } from 'vitest';
import { clampPage, getPageCount, paginate } from './paginate';
import { buildRows } from './rows';

const data = Array.from({ length: 23 }, (_, i) => ({ id: `r${i + 1}` }));

describe('getPageCount', () => {
  it('ceils total / pageSize, min 1', () => {
    expect(getPageCount(23, 10)).toBe(3);
    expect(getPageCount(20, 10)).toBe(2);
    expect(getPageCount(0, 10)).toBe(1);
  });
});

describe('clampPage', () => {
  it('keeps page within 1..pageCount', () => {
    expect(clampPage(0, 23, 10)).toBe(1);
    expect(clampPage(99, 23, 10)).toBe(3);
    expect(clampPage(2, 23, 10)).toBe(2);
  });
});

describe('paginate', () => {
  it('slices the requested page and reports offset', () => {
    const p2 = paginate(data, 2, 10);
    expect(p2.items).toHaveLength(10);
    expect(p2.items[0]?.id).toBe('r11');
    expect(p2.offset).toBe(10);
    expect(p2.pageCount).toBe(3);
  });

  it('last page may be partial', () => {
    const p3 = paginate(data, 3, 10);
    expect(p3.items).toHaveLength(3);
    expect(p3.items[0]?.id).toBe('r21');
  });

  it('offset keeps globalIndex absolute while displayIndex resets per page', () => {
    const p2 = paginate(data, 2, 10);
    const rows = buildRows(p2.items, { getRowId: (r) => r.id, offset: p2.offset });
    expect(rows[0]?.displayIndex).toBe(1); // page-local
    expect(rows[0]?.globalIndex).toBe(11); // dataset-absolute
    expect(rows[0]?.rowId).toBe('r11'); // stable PK, unaffected by paging
  });

  it('pageSize <= 0 returns everything as a single page', () => {
    expect(paginate(data, 1, 0).items).toBe(data);
  });
});
