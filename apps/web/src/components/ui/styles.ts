/**
 * Server-safe class builders for the V2 primitives (no React, no 'use client'), so Server
 * Components can style links and inputs, and client components share one source (UI-2B, M2).
 * Variants are static class maps so Tailwind sees every class; colours come only from tokens.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'border border-line-strong bg-surface text-fg shadow-xs hover:bg-subtle active:bg-[var(--state-pressed)]',
  ghost: 'text-fg hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]',
  danger: 'bg-error text-on-error shadow-xs hover:bg-error-hover active:bg-error-strong',
  success: 'bg-success text-on-success shadow-xs hover:bg-success-strong active:bg-success-strong',
};

/* sm 36 (touch target extended to 44 by an invisible ::before) · md 44 · lg 52 */
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "relative h-9 gap-1.5 rounded-control px-3 text-sm before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
  md: 'h-11 gap-2 rounded-control px-5 text-base',
  lg: 'h-13 gap-2 rounded-card px-6 text-base',
};

export const BUTTON_BASE =
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
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`;
}

export function iconButtonClasses({
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  className = '',
}: {
  variant?: Exclude<ButtonVariant, 'success'>;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'circle';
  className?: string;
} = {}) {
  const box =
    size === 'sm'
      ? "relative size-9 before:absolute before:-inset-1 before:content-['']"
      : 'size-11';
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${box} ${shape === 'circle' ? 'rounded-full' : 'rounded-control'} p-0 ${className}`;
}

/**
 * Text controls. Placeholder: fg-subtle on white (4.94:1); on a read-only (sunken) field it
 * switches to fg-muted because fg-subtle on surface-sunken is only 4.49:1 (M8).
 */
export const controlClasses =
  'w-full rounded-control border border-line-strong bg-surface px-3.5 text-base text-fg shadow-xs ' +
  'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-[var(--duration-fast)] ' +
  'hover:border-fg-subtle focus-visible:border-primary-base ' +
  'aria-invalid:border-error-base ' +
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-[var(--state-disabled-bg)] disabled:text-fg-disabled disabled:shadow-none ' +
  'read-only:bg-sunken read-only:placeholder:text-fg-muted';
