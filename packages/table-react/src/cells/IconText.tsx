import type { ReactNode } from 'react';
import type { ChipTone } from './Chip';

export interface IconTextProps {
  /** leading icon (e.g. a lucide icon) */
  icon?: ReactNode;
  children: ReactNode;
  /** color tone applied to the icon */
  tone?: ChipTone;
  /** also tint the label text (and bold it) with the tone */
  tintText?: boolean;
}

/**
 * IconText — an icon next to a label (no pill). The icon takes the tone color;
 * with `tintText` the label is tinted too. Good for type/priority/status columns
 * shown as "🐞 Bug", "⬆ High", "✓ Done", etc.
 */
export function IconText({ icon, children, tone = 'neutral', tintText }: IconTextProps) {
  return (
    <span className="sft-icontext" data-tone={tone} data-tint={tintText || undefined}>
      {icon != null && <span className="sft-icontext__icon">{icon}</span>}
      <span className="sft-icontext__label">{children}</span>
    </span>
  );
}
