import {
  EXPORT_FORMAT_META,
  type ExportCell,
  type ExportFormat,
  type ExportTable,
  serializeExport,
} from '@softium/table-core';
import type { TableInstance } from '../hooks/useTable';
import type { ResolvedReactColumn } from '../types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Turn a raw cell value into an export-friendly primitive (numbers stay numeric). */
function exportValue(value: unknown, type: ResolvedReactColumn<unknown>['type']): ExportCell {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isoDate(value);
  if (type === 'date') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : isoDate(d);
  }
  if (type === 'number') {
    return typeof value === 'number' ? value : (Number(value) ?? String(value));
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * Build the rectangular export view from a table instance: visible columns (in
 * their current order, with any renamed headers) × every filtered/sorted row
 * (pagination ignored). A custom `exportValue` on a column def wins.
 */
export function buildExportTable<T>(table: TableInstance<T>): ExportTable {
  const columns = table.getRenderColumns();
  const rows = table.getAllRows();
  const headers = columns.map((c) => c.displayLabel);
  const matrix = rows.map((row) =>
    columns.map((col) => {
      const custom = col.def.exportValue;
      return custom ? custom(row.data) : exportValue(row.data[col.key], col.type);
    }),
  );
  return { headers, rows: matrix };
}

export interface DownloadOptions {
  /** base file name (without extension). Default "table". */
  fileName?: string;
}

/**
 * Serialize the table to `format` and trigger a browser download. No-op outside
 * a DOM environment.
 */
export function downloadTableExport<T>(
  table: TableInstance<T>,
  format: ExportFormat,
  options: DownloadOptions = {},
): void {
  if (typeof document === 'undefined') return;
  const meta = EXPORT_FORMAT_META[format];
  const payload = serializeExport(buildExportTable(table), format);
  // string and Uint8Array are both valid BlobParts at runtime; the cast placates
  // TS 5.7's generic Uint8Array<ArrayBufferLike> not matching BufferSource.
  const blob = new Blob([payload as unknown as BlobPart], { type: meta.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.fileName ?? 'table'}.${meta.ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // release the object URL on the next tick
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
