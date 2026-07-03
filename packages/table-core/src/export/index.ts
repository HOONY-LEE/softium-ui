import { toCSV } from './csv';
import { toJSON } from './json';
import type { ExportFormat, ExportTable } from './types';
import { toXLSX } from './xlsx';
import { toXML } from './xml';

export { toCSV } from './csv';
export type { CsvOptions } from './csv';
export { toJSON } from './json';
export type { JsonOptions } from './json';
export { toXML, escapeXml } from './xml';
export type { XmlOptions } from './xml';
export { toXLSX } from './xlsx';
export type { XlsxOptions } from './xlsx';
export { zipStore } from './zip';
export type { ZipEntry } from './zip';
export type { ExportCell, ExportTable, ExportFormat } from './types';

/** MIME type + file extension for each export format. */
export const EXPORT_FORMAT_META: Record<ExportFormat, { mime: string; ext: string }> = {
  csv: { mime: 'text/csv;charset=utf-8', ext: 'csv' },
  json: { mime: 'application/json;charset=utf-8', ext: 'json' },
  xml: { mime: 'application/xml;charset=utf-8', ext: 'xml' },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  },
};

/**
 * Serialize an export table to the given format. Text formats return a string;
 * xlsx returns raw bytes (a Uint8Array). Framework-agnostic — the download
 * itself (Blob + anchor) lives in the React layer.
 */
export function serializeExport(table: ExportTable, format: ExportFormat): string | Uint8Array {
  switch (format) {
    case 'csv':
      return toCSV(table);
    case 'json':
      return toJSON(table);
    case 'xml':
      return toXML(table);
    case 'xlsx':
      return toXLSX(table);
    default:
      return toCSV(table);
  }
}
