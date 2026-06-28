import type { ReactNode } from 'react';

export interface NumberTextProps {
  value: number | string | null | undefined;
  /** prefix, e.g. "₩" or "$" */
  prefix?: ReactNode;
  /** suffix, e.g. "%", "원", "kg" */
  suffix?: ReactNode;
  /** fixed decimal places */
  decimals?: number;
  /** thousands grouping. Default true. */
  grouping?: boolean;
}

/**
 * NumberText — formatted numeric value with optional prefix/suffix and decimals.
 * Affixes are muted so the number stays the focus.
 */
export function NumberText({
  value,
  prefix,
  suffix,
  decimals,
  grouping = true,
}: NumberTextProps): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  const body = Number.isNaN(n)
    ? String(value)
    : n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouping,
      });

  return (
    <span className="sft-num">
      {prefix != null && <span className="sft-num__affix">{prefix}</span>}
      <span className="sft-num__value">{body}</span>
      {suffix != null && <span className="sft-num__affix">{suffix}</span>}
    </span>
  );
}
