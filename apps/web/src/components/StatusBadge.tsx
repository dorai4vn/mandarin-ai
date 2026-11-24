import type { Label } from '@/lib/status';

const STYLES: Record<Label['status'], string> = {
  VERIFIED: 'border-success bg-success-subtle text-success-strong',
  LIVE_UNCONFIRMED: 'border-primary-base bg-primary-subtle text-primary-strong',
  MOCKED: 'border-warning bg-warning-subtle text-warning-text',
  BLOCKED: 'border-error bg-error-subtle text-error-strong',
  UNTESTED: 'border-line bg-surface text-fg-muted',
};

export function StatusBadge({ label }: { label: Label }) {
  return (
    <p
      role="status"
      data-status={label.status}
      className={`inline-block rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${STYLES[label.status]}`}
    >
      {label.text}
    </p>
  );
}
