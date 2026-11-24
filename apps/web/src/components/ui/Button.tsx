'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Spinner } from './Spinner';
import { buttonClasses, iconButtonClasses, type ButtonSize, type ButtonVariant } from './styles';

/**
 * Button and IconButton (COMPONENT_SPEC_V2 §1, §24). Client components: the loading guard is an
 * event handler, so they can be rendered from Server Components too (as client boundaries) — M2.
 */
type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, sets aria-busy and blocks repeated clicks and form submission. */
  loading?: boolean;
  /** Icon before the label (20 px). Replaced by the spinner while loading. */
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading = false,
  icon,
  className,
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      data-touch={size === 'sm' ? 'extended' : undefined}
      {...props}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={buttonClasses({
        variant,
        size,
        fullWidth,
        className: `${loading ? 'cursor-progress' : ''} ${className ?? ''}`,
      })}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/**
 * Icon-only button: 44 × 44 (sm 36 + 44 touch target). The accessible name is mandatory. No
 * `title` (it duplicated the name, M10) — wrap in <Tooltip> for a visible label on hover/focus.
 */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  className = '',
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'aria-label'> & {
  label: string;
  variant?: Exclude<ButtonVariant, 'success'>;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'circle';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-touch={size === 'sm' ? 'extended' : undefined}
      {...props}
      className={iconButtonClasses({ variant, size, shape, className })}
    >
      {children}
    </button>
  );
}
