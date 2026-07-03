import { describe, expect, it } from 'vitest';
import { toCSV } from './csv';
import { toJSON } from './json';
import type { ExportTable } from './types';
import { toXLSX } from './xlsx';
import { toXML } from './xml';

const table: ExportTable = {
  headers: ['이름', 'Salary', 'Note'],
  rows: [
    ['김민준', 3200, 'a,b'],
    ['O"Brien', 4100, 'line1\nline2'],
  ],
};

describe('export/csv', () => {
  it('escapes delimiters, quotes and newlines, CRLF between rows', () => {
    const csv = toCSV(table);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('이름,Salary,Note');
    expect(lines[1]).toBe('김민준,3200,"a,b"');
    expect(lines[2]).toBe('"O""Brien",4100,"line1\nline2"');
  });

  it('supports a custom delimiter (TSV)', () => {
    expect(toCSV({ headers: ['a', 'b'], rows: [[1, 2]] }, { delimiter: '\t' })).toBe(
      'a\tb\r\n1\t2',
    );
  });
});

describe('export/json', () => {
  it('emits header-keyed records', () => {
    const parsed = JSON.parse(toJSON(table));
    expect(parsed).toEqual([
      { 이름: '김민준', Salary: 3200, Note: 'a,b' },
      { 이름: 'O"Brien', Salary: 4100, Note: 'line1\nline2' },
    ]);
  });
});

describe('export/xml', () => {
  it('wraps rows and escapes, sanitizing header tag names', () => {
    const xml = toXML({ headers: ['first name', 'age'], rows: [['A&B', 3]] });
    expect(xml).toContain('<rows>');
    expect(xml).toContain('<first_name>A&amp;B</first_name>');
    expect(xml).toContain('<age>3</age>');
  });
});

describe('export/xlsx', () => {
  it('produces a ZIP (PK header) with the sheet part and cell values', () => {
    const bytes = toXLSX(table);
    // ZIP local file header signature "PK\x03\x04"
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('<v>3200</v>'); // numeric cell
    expect(text).toContain('김민준'); // inline string cell
  });
});
