import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface ChipProps {
  children: ReactNode;
  /** semantic color tone */
  tone?: ChipTone;
  /** show a leading status dot */
  dot?: boolean;
}

/**
 * Chip — a pill for enum / status / category values. Tones resolve to design tokens
 * (tinted background + matching text), so they re-skin with the theme.
 */
export function Chip({ children, tone = 'neutral', dot = false }: ChipProps) {
  return (
    <span className="sft-chip" data-tone={tone}>
      {dot && <span className="sft-chip__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
