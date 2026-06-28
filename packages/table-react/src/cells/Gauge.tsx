import type { ChipTone } from './Chip';

export interface GaugeProps {
  value: number;
  max?: number;
  /** show the "n%" label next to the bar. Default true. */
  showLabel?: boolean;
  /** bar color tone. Default 'accent'. */
  tone?: Extract<ChipTone, 'accent' | 'success' | 'warning' | 'danger'>;
}

/** Gauge — a horizontal progress bar with an optional percentage label. */
export function Gauge({ value, max = 100, showLabel = true, tone = 'accent' }: GaugeProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <span className="sft-gauge">
      <span className="sft-gauge__track">
        <span className="sft-gauge__fill" data-tone={tone} style={{ width: `${pct}%` }} />
      </span>
      {showLabel && <span className="sft-gauge__label">{pct}%</span>}
    </span>
  );
}
