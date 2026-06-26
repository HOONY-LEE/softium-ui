import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cx } from '../util/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** stretch to the container width */
  block?: boolean;
}

/**
 * Button — the one primitive seeded deliberately (used everywhere). Everything else
 * is extracted from real usage as it appears.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconLeft,
    iconRight,
    block,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx(
        'sft-button',
        `sft-button--${variant}`,
        `sft-button--${size}`,
        block && 'sft-button--block',
        className,
      )}
      {...rest}
    >
      {iconLeft && <span className="sft-button__icon">{iconLeft}</span>}
      {children != null && <span className="sft-button__label">{children}</span>}
      {iconRight && <span className="sft-button__icon">{iconRight}</span>}
    </button>
  );
});
