import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Badge (COMPONENT_SPEC_V2 §11): pill 24 px, 12/600, subtle background + `*.text`. Colour is never
 * the only signal — the label is always text.
 */
export type BadgeVariant =
  'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-subtle text-fg-muted',
  primary: 'bg-primary-subtle text-primary-strong',
  secondary: 'bg-secondary-subtle text-secondary-text',
  success: 'bg-success-subtle text-success-strong',
  warning: 'bg-warning-subtle text-warning-text',
  error: 'bg-error-subtle text-error-strong',
  accent: 'bg-accent-subtle text-accent-strong',
};

export function Badge({
  variant = 'neutral',
  icon,
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; icon?: ReactNode }) {
  return (
    <span
      {...props}
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold leading-4 tracking-[0.01em] ${VARIANT[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Numeric count (e.g. cards due — real data only). `label` is read instead of the bare number. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-on-primary">
      <span aria-hidden>{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ---------- Status indicator: dot + text (Sync Indicator style, COMPONENT_SPEC_V2 §20) ---------- */

export type StatusTone = 'success' | 'warning' | 'error' | 'primary' | 'neutral';
const DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error-base',
  primary: 'bg-primary-base',
  neutral: 'bg-fg-subtle',
};

export function StatusDot({
  tone,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone: StatusTone }) {
  return (
    <span
      {...props}
      className={`inline-flex h-7 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-medium text-fg ${className}`}
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
