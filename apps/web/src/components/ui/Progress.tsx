import type { ReactNode } from 'react';

/**
 * ProgressBar / ProgressRing (COMPONENT_SPEC_V2 §12). Server-safe (no handlers).
 * role="progressbar" with aria-valuenow/min/max (value clamped to [0, max]) and an accessible
 * name (`label`, optionally shown). Indeterminate (value undefined): no aria-valuenow,
 * aria-busy, a sliding stripe — with reduced motion the stripe stops and "Đang xử lý…" is shown.
 * Fill moves with `scale` (transform-class property, 200 ms). Show REAL progress only; sample
 * values belong in the gallery, labelled "Ví dụ".
 */
type Tone = 'primary' | 'success';
const FILL: Record<Tone, string> = { primary: 'bg-primary-base', success: 'bg-success' };
const STROKE: Record<Tone, string> = { primary: 'stroke-primary-base', success: 'stroke-success' };

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
/** max ≤ 0 or NaN would produce NaN in ARIA values and styles; treat it as 1. */
const safeMax = (max: number) => (Number.isFinite(max) && max > 0 ? max : 1);

export function ProgressBar({
  value,
  max = 100,
  label,
  showLabel = false,
  valueText,
  tone = 'primary',
  thin = false,
  className = '',
  'data-testid': testId,
}: {
  /** undefined → indeterminate. */
  value?: number;
  max?: number;
  label: string;
  showLabel?: boolean;
  /** Visible + spoken value, e.g. "7 / 20". Defaults to a percentage. */
  valueText?: string;
  tone?: Tone;
  thin?: boolean;
  className?: string;
  'data-testid'?: string;
}) {
  max = safeMax(max);
  const indeterminate = value === undefined;
  const v = indeterminate ? 0 : clamp(value, max);
  const text = indeterminate ? undefined : (valueText ?? `${Math.round((v / max) * 100)}%`);
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-fg">{label}</span>
          {text && <span className="tabular-nums text-fg-muted">{text}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : v}
        aria-valuetext={text}
        aria-busy={indeterminate || undefined}
        data-testid={testId}
        className={`relative w-full overflow-hidden rounded-full bg-subtle ${thin ? 'h-1' : 'h-2'}`}
      >
        {indeterminate ? (
          <span className="progress-indeterminate absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary-base" />
        ) : (
          <span
            className={`absolute inset-0 origin-left rounded-full transition-[scale] duration-[var(--duration-base)] ease-[var(--ease-standard)] ${FILL[tone]}`}
            style={{ scale: `${v / max} 1` }}
          />
        )}
      </div>
      {indeterminate && (
        <span className="hidden text-sm text-fg-muted motion-reduce:inline">Đang xử lý…</span>
      )}
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  label,
  size = 64,
  tone = 'primary',
  valueText,
  children,
  'data-testid': testId,
}: {
  value: number;
  /** Spoken value when the centre shows something other than a percentage, e.g. "7 / 20". */
  valueText?: string;
  max?: number;
  label: string;
  /** 56–80 px. */
  size?: 56 | 64 | 72 | 80;
  tone?: Tone;
  /** Centre content; defaults to the percentage. */
  children?: ReactNode;
  'data-testid'?: string;
}) {
  max = safeMax(max);
  const v = clamp(value, max);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round((v / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={v}
      aria-valuetext={valueText}
      data-testid={testId}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-subtle"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / max)}
          className={STROKE[tone]}
        />
      </svg>
      <span aria-hidden className="absolute text-sm font-semibold tabular-nums text-fg">
        {children ?? `${pct}%`}
      </span>
    </div>
  );
}
