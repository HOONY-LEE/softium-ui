import type { ExportTable } from './types';

export interface JsonOptions {
  /** pretty-print with 2-space indent. Default true. */
  pretty?: boolean;
}

/** Serialize an export table to a JSON array of header-keyed record objects. */
export function toJSON(table: ExportTable, options: JsonOptions = {}): string {
  const records = table.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    table.headers.forEach((h, i) => {
      obj[h] = row[i] ?? null;
    });
    return obj;
  });
  return JSON.stringify(records, null, options.pretty === false ? undefined : 2);
}
