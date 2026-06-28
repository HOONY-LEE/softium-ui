import type { ReactNode } from 'react';

export interface BooleanDotProps {
  value: boolean;
  /** label for the true state */
  trueLabel?: ReactNode;
  /** label for the false state */
  falseLabel?: ReactNode;
}

/** BooleanDot — status dot (+ optional label) for boolean values. */
export function BooleanDot({ value, trueLabel, falseLabel }: BooleanDotProps) {
  const label = value ? trueLabel : falseLabel;
  return (
    <span className="sft-booldot" data-on={value || undefined}>
      <span className="sft-booldot__dot" aria-hidden="true" />
      {label != null && <span className="sft-booldot__label">{label}</span>}
    </span>
  );
}
