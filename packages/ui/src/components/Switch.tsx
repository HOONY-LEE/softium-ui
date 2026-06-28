import { type ReactNode, useId } from 'react';
import { cx } from '../util/cx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** text shown next to the switch */
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Switch — an independent on/off toggle. Built on a real checkbox (role="switch")
 * so it's keyboard- and screen-reader-accessible.
 */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('sft-switch', disabled && 'sft-switch--disabled', className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="sft-switch__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="sft-switch__track" aria-hidden="true">
        <span className="sft-switch__thumb" />
      </span>
      {label != null && <span className="sft-switch__label">{label}</span>}
    </label>
  );
}
