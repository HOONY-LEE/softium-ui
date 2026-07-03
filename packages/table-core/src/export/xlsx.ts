import type { ExportCell, ExportTable } from './types';
import { escapeXml } from './xml';
import { utf8Bytes, zipStore } from './zip';

export interface XlsxOptions {
  /** worksheet tab name. Default "Sheet1". Excel caps names at 31 chars. */
  sheetName?: string;
}

/** 0-based column index → spreadsheet column letters (A, B, … Z, AA, …). */
function colLetter(index: number): string {
  let s = '';
  let i = index + 1;
  while (i > 0) {
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function cellXml(ref: string, value: ExportCell): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const s = value == null ? '' : String(value);
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(s)}</t></is></c>`;
}

/** valid worksheet name: strip Excel-forbidden chars and clamp to 31 chars */
function safeSheetName(name: string): string {
  return (name.replace(/[[\]:*?/\\]/g, ' ').trim() || 'Sheet1').slice(0, 31);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

/**
 * Serialize an export table to a real .xlsx workbook (OOXML zip) as raw bytes —
 * no dependencies. Numeric cells are written as numbers; everything else as
 * inline strings. Open the returned bytes in Excel / Numbers / Google Sheets.
 */
export function toXLSX(table: ExportTable, options: XlsxOptions = {}): Uint8Array {
  const sheetName = safeSheetName(options.sheetName ?? 'Sheet1');
  const matrix: ExportCell[][] = [table.headers, ...table.rows];

  const rowsXml = matrix
    .map((row, r) => {
      const cells = row.map((v, c) => cellXml(`${colLetter(c)}${r + 1}`, v)).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  return zipStore([
    { name: '[Content_Types].xml', data: utf8Bytes(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8Bytes(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: utf8Bytes(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8Bytes(WORKBOOK_RELS) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8Bytes(sheet) },
  ]);
}
