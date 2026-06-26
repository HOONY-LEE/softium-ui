/**
 * adaptArray — the simplest ERP response: a plain array of row objects.
 *
 *   const data = adaptArray<Employee>(raw); // raw: [ {...}, {...} ]
 *
 * Columns are supplied separately by the developer. This only normalizes/validates
 * the data array.
 */

export function adaptArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) {
    throw new TypeError(
      `adaptArray expected an array, received ${raw === null ? 'null' : typeof raw}.`,
    );
  }
  return raw as T[];
}
