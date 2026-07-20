/** Excel/Sheets-style autofill series detection for the fill handle. */

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function roundNum(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

/**
 * Given the raw source cells in fill order, returns a function producing the
 * raw value `offset` cells past the source (1-based) — or null if no
 * recognizable series exists, so the caller falls back to cyclically repeating
 * the source block.
 *
 * Recognizes: arithmetic numeric sequences (1,2,3,4 → 5,6,7 / 2,4,6,8 →
 * 10,12 / 1,1,1,1 → 1,1,1, a constant is just step-0 arithmetic) and the
 * Korean weekday cycle (월,화,수,목 → 금,토,일).
 */
export function makeSeriesExtender(rawValues: string[]): ((offset: number) => string) | null {
  const trimmed = rawValues.map((v) => v.trim());
  if (trimmed.length < 2 || trimmed.some((v) => v.startsWith('='))) return null;

  if (trimmed.every((v) => v !== '' && !Number.isNaN(Number(v)))) {
    const nums = trimmed.map(Number);
    const step = nums[1]! - nums[0]!;
    const isArithmetic = nums.every((n, i) => i === 0 || Math.abs(n - nums[i - 1]! - step) < 1e-9);
    if (isArithmetic) {
      const last = nums[nums.length - 1]!;
      return (offset: number) => String(roundNum(last + step * offset));
    }
  }

  const idxs = trimmed.map((v) => WEEKDAYS_KO.indexOf(v));
  if (idxs.every((i) => i >= 0)) {
    const step = (((idxs[1]! - idxs[0]!) % 7) + 7) % 7;
    const stepOk = idxs.every((i, k) => k === 0 || (idxs[k - 1]! + step) % 7 === i);
    if (stepOk) {
      const lastIdx = idxs[idxs.length - 1]!;
      return (offset: number) => WEEKDAYS_KO[(((lastIdx + step * offset) % 7) + 7) % 7]!;
    }
  }

  return null;
}
