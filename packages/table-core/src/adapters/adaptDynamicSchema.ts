/**
 * adaptDynamicSchema — legacy ERP that sends column definitions alongside rows
 * (the table shape is decided by the server at runtime, not hardcoded in the app).
 *
 *   const { columns, data } = adaptDynamicSchema(raw, {
 *     columnsKey: 'columns', rowsKey: 'rows', fieldKey: 'field', labelKey: 'label',
 *   });
 *
 * Produces real `ColumnDef`s so the rest of the library treats dynamic and static
 * schemas identically.
 */

import type { ColumnDef, ColumnType } from '../types';
import { getProp, isRecord } from './util';

export interface DynamicSchemaResult<T> {
  columns: ColumnDef<T>[];
  data: T[];
}

export interface AdaptDynamicSchemaOptions {
  /** key under which the server lists column descriptors. Default 'columns'. */
  columnsKey?: string;
  /** key under which the server lists row objects. Default 'rows'. */
  rowsKey?: string;
  /** descriptor field holding the data-binding key. Default 'field'. */
  fieldKey?: string;
  /** descriptor field holding the header text. Default 'label'. */
  labelKey?: string;
  /** descriptor field holding the column type (optional). Default 'type'. */
  typeKey?: string;
}

const KNOWN_TYPES: ReadonlySet<string> = new Set<ColumnType>([
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'custom',
]);

function toColumnType(value: unknown): ColumnType | undefined {
  return typeof value === 'string' && KNOWN_TYPES.has(value) ? (value as ColumnType) : undefined;
}

export function adaptDynamicSchema<T = Record<string, unknown>>(
  raw: unknown,
  options: AdaptDynamicSchemaOptions = {},
): DynamicSchemaResult<T> {
  const {
    columnsKey = 'columns',
    rowsKey = 'rows',
    fieldKey = 'field',
    labelKey = 'label',
    typeKey = 'type',
  } = options;

  const rawColumns = getProp(raw, columnsKey);
  if (!Array.isArray(rawColumns)) {
    throw new TypeError(
      `adaptDynamicSchema expected an array at "${columnsKey}", received ${typeof rawColumns}.`,
    );
  }

  const rawRows = getProp(raw, rowsKey);
  if (!Array.isArray(rawRows)) {
    throw new TypeError(
      `adaptDynamicSchema expected an array at "${rowsKey}", received ${typeof rawRows}.`,
    );
  }

  const columns: ColumnDef<T>[] = rawColumns.map((descriptor, i) => {
    if (!isRecord(descriptor)) {
      throw new TypeError(`adaptDynamicSchema: column descriptor at index ${i} is not an object.`);
    }
    const field = descriptor[fieldKey];
    if (typeof field !== 'string' || field.length === 0) {
      throw new TypeError(
        `adaptDynamicSchema: column descriptor at index ${i} has no string "${fieldKey}".`,
      );
    }
    const rawLabel = descriptor[labelKey];
    const label = typeof rawLabel === 'string' && rawLabel.length > 0 ? rawLabel : field;
    const type = toColumnType(descriptor[typeKey]);

    return {
      key: field as keyof T & string,
      label,
      ...(type ? { type } : {}),
    } satisfies ColumnDef<T>;
  });

  return { columns, data: rawRows as T[] };
}
