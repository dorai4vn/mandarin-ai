import type { Label } from '@/lib/status';

const STYLES: Record<Label['status'], string> = {
  VERIFIED: 'border-jade text-jade',
  LIVE_UNCONFIRMED: 'border-sky text-sky',
  MOCKED: 'border-amber text-amber',
  BLOCKED: 'border-seal text-seal',
  UNTESTED: 'border-line text-ink-2',
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
