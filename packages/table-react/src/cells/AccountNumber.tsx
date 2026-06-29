import type { ReactNode } from 'react';

export interface AccountNumberProps {
  value: string | number | null | undefined;
  /** segment lengths, e.g. [3, 4, 6] → 110-1234-567890. Omit to show digits as-is. */
  groups?: number[];
  /** mask all but the last 4 digits */
  mask?: boolean;
  /** optional bank / label prefix */
  bank?: ReactNode;
}

function group(digits: string, groups?: number[]): string {
  if (!groups || groups.length === 0) return digits;
  const parts: string[] = [];
  let i = 0;
  for (const len of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + len));
    i += len;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join('-');
}

/** AccountNumber — monospace bank account display with optional grouping/masking. */
export function AccountNumber({ value, groups, mask, bank }: AccountNumberProps): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  let digits = String(value).replace(/\D/g, '');
  if (mask && digits.length > 4) {
    digits = '•'.repeat(digits.length - 4) + digits.slice(-4);
  }
  return (
    <span className="sft-account">
      {bank != null && <span className="sft-account__bank">{bank}</span>}
      <code className="sft-account__num">{group(digits, groups)}</code>
    </span>
  );
}
