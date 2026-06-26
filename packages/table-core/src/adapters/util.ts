/** Internal helpers for reading unknown server payloads without `any`. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getProp(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
