import type { ExportCell, ExportTable } from './types';

export interface XmlOptions {
  /** wrapping root element. Default "rows". */
  rootTag?: string;
  /** per-row element. Default "row". */
  rowTag?: string;
}

/** XML-escape a text value for element content / attributes. */
export function escapeXml(value: ExportCell): string {
  const s = value == null ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Turn a header label into a valid XML element name (fallback `colN`). */
function toTagName(header: string, index: number): string {
  let name = header.replace(/[^A-Za-z0-9_.-]/g, '_');
  if (!name || !/^[A-Za-z_]/.test(name)) name = `_${name}`;
  return name || `col${index}`;
}

/** Serialize an export table to XML: <root><row><header>value</header>…</row></root>. */
export function toXML(table: ExportTable, options: XmlOptions = {}): string {
  const root = options.rootTag ?? 'rows';
  const rowTag = options.rowTag ?? 'row';
  const tags = table.headers.map((h, i) => toTagName(h, i));

  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<${root}>`];
  for (const row of table.rows) {
    lines.push(`  <${rowTag}>`);
    row.forEach((cell, i) => {
      const tag = tags[i] ?? `col${i}`;
      lines.push(`    <${tag}>${escapeXml(cell)}</${tag}>`);
    });
    lines.push(`  </${rowTag}>`);
  }
  lines.push(`</${root}>`);
  return lines.join('\n');
}
