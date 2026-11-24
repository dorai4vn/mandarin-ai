import type { Label } from '@/lib/status';

/**
 * Spike status (M0 meaning kept, COMPONENT_SPEC_V2 §11): VERIFIED → success, LIVE_UNCONFIRMED →
 * primary, MOCKED → warning, BLOCKED → error, UNTESTED → neutral. Always text, never colour only;
 * `role="status"`, `data-status` and the text are unchanged from M0 (tests rely on them).
 * Same tokens as V2 Badge, but a rounded rectangle because the text can wrap (error details).
 */
const STYLES: Record<Label['status'], { box: string; dot: string }> = {
  VERIFIED: { box: 'bg-success-subtle text-success-strong', dot: 'bg-success' },
  LIVE_UNCONFIRMED: { box: 'bg-primary-subtle text-primary-strong', dot: 'bg-primary-base' },
  MOCKED: { box: 'bg-warning-subtle text-warning-text', dot: 'bg-warning' },
  BLOCKED: { box: 'bg-error-subtle text-error-strong', dot: 'bg-error-base' },
  UNTESTED: { box: 'bg-subtle text-fg-muted', dot: 'bg-fg-subtle' },
};

export function StatusBadge({ label }: { label: Label }) {
  const s = STYLES[label.status];
  return (
    <p
      role="status"
      data-status={label.status}
      className={`inline-flex max-w-full items-start gap-2 rounded-control px-3 py-1.5 text-sm font-semibold leading-5 ${s.box}`}
    >
      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${s.dot}`} />
      <span className="min-w-0 break-words">{label.text}</span>
    </p>
  );
}
