import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** each tab grows to fill (used inside grids/rows). Default false. */
  block?: boolean;
  className?: string;
}

/**
 * SegmentTabs — an iOS-style segmented control: a muted track with a raised
 * white pill on the active tab. Ported from calendary's SegmentTabs.
 */
export function SegmentTabs<T extends string>({
  value,
  onValueChange,
  options,
  block,
  className,
}: SegmentTabsProps<T>) {
  return (
    <div
      className={`sft-cal-seg${block ? ' sft-cal-seg--block' : ''}${className ? ` ${className}` : ''}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="sft-cal-seg__btn"
          data-active={value === option.value || undefined}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
