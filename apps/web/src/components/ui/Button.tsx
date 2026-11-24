import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Button family (COMPONENT_SPEC_V2 §1, §24). Variants and sizes are static class maps so Tailwind
 * can see every class. Colours come only from semantic tokens.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'border border-line-strong bg-surface text-fg shadow-xs hover:bg-subtle active:bg-[var(--state-pressed)]',
  ghost: 'text-fg hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]',
  danger: 'bg-error text-on-error shadow-xs hover:bg-error-hover active:bg-error-strong',
  success: 'bg-success text-on-success shadow-xs hover:bg-success-strong active:bg-success-strong',
};

/* sm 36 (touch target extended to 44 by an invisible ::before) · md 44 · lg 52 */
const SIZE: Record<ButtonSize, string> = {
  sm: "relative h-9 gap-1.5 rounded-control px-3 text-sm before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
  md: 'h-11 gap-2 rounded-control px-5 text-base',
  lg: 'h-13 gap-2 rounded-card px-6 text-base',
};

const BASE =
  'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold ' +
  'transition-[background-color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ' +
  'active:scale-[0.98] motion-reduce:active:scale-100 ' +
  'disabled:pointer-events-none disabled:border-transparent disabled:bg-[var(--state-disabled-bg)] disabled:text-fg-disabled disabled:shadow-none ' +
  'aria-disabled:pointer-events-none aria-disabled:bg-[var(--state-disabled-bg)] aria-disabled:text-fg-disabled aria-disabled:shadow-none';

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`size-4 animate-spin motion-reduce:animate-none ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `'ghost'` before UI-2 meant the outlined button; existing call sites keep that look. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, sets aria-busy and blocks repeated clicks; the label stays (no width jump). */
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

/** Navigation that looks like a button: a real link, never a <button> that changes page. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  icon,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} {...props} className={buttonClasses({ variant, size, fullWidth, className })}>
      {icon}
      {children}
    </Link>
  );
}

/** Icon-only button: 44 × 44 (sm 36 + 44 touch target). An accessible name is mandatory. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  className = '',
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  variant?: Exclude<ButtonVariant, 'success'>;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'circle';
}) {
  const box =
    size === 'sm'
      ? "relative size-9 before:absolute before:-inset-1 before:content-['']"
      : 'size-11';
  return (
    <button
      type="button"
      aria-label={label}
      data-touch={size === 'sm' ? 'extended' : undefined}
      title={label}
      {...props}
      className={`${BASE} ${VARIANT[variant]} ${box} ${shape === 'circle' ? 'rounded-full' : 'rounded-control'} p-0 ${className}`}
    >
      {children}
    </button>
  );
}
