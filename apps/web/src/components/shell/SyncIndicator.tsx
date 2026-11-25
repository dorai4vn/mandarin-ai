'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SYNC_DISABLED_MESSAGE, useOffline } from '../OfflineProvider';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

/**
 * Sync Indicator (COMPONENT_SPEC_V2 §20, UI-4). Logic G1 / D-035 unchanged from M0:
 * "Đã đồng bộ" ONLY when nothing is pending AND nothing was refused AND sync is enabled;
 * priority: error > offline > local-only > pending > synced. A mock acknowledgement is never
 * treated as saved. The visible strings and `data-testid="sync-chip"` / `data-sync-state` are
 * the M0 ones (tests and users rely on them).
 *
 * The pill is a button that opens a small non-modal popover: network, pending, errors, last sync
 * and "Đồng bộ ngay". `compact` (collapsed sidebar) shows only the dot; the text stays available
 * to assistive tech.
 */
export function useSyncStatus() {
  const { online, pending, rejected, syncAvailability } = useOffline();
  const localOnly = syncAvailability === 'disabled';
  const state =
    rejected > 0
      ? 'error'
      : !online
        ? 'offline'
        : localOnly
          ? 'local-only'
          : pending > 0
            ? 'pending'
            : 'synced';
  const text =
    state === 'error'
      ? `${rejected} lỗi đồng bộ`
      : state === 'offline'
        ? 'Offline'
        : state === 'local-only'
          ? 'Lưu trên thiết bị'
          : state === 'pending'
            ? `${pending} chờ đồng bộ`
            : 'Đã đồng bộ';
  return { state, text, localOnly } as const;
}

const DOT = {
  error: 'bg-error-base',
  offline: 'bg-warning',
  'local-only': 'bg-fg-subtle',
  pending: 'bg-primary-base',
  synced: 'bg-success',
} as const;

export function SyncIndicator({
  compact = false,
  align = 'end',
}: {
  compact?: boolean;
  /** Popover alignment relative to the pill. */
  align?: 'start' | 'end';
}) {
  const { online, pending, rejected, store, lastSync, syncNow } = useOffline();
  const { state, text, localOnly } = useSyncStatus();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Compact (collapsed sidebar): the popover is `fixed` beside the pill so the scrolling sidebar
  // (overflow) cannot clip it.
  const [fixedAt, setFixedAt] = useState<{ left: number; bottom: number } | null>(null);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const description =
    state === 'local-only'
      ? SYNC_DISABLED_MESSAGE
      : store?.kind === 'memory'
        ? `${text}. Không có lưu trữ offline trên trình duyệt này.`
        : text;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const syncNowClicked = async () => {
    setBusy(true);
    try {
      const s = await syncNow({ force: true });
      if (!s) {
        toast({ message: localOnly ? SYNC_DISABLED_MESSAGE : 'Chưa thể đồng bộ lúc này.' });
      } else if (s.rejected > 0) {
        toast({ message: `${s.rejected} thao tác bị máy chủ từ chối.`, tone: 'error' });
      } else if (s.error) {
        toast({ message: 'Đồng bộ chưa xong — sẽ tự thử lại.', tone: 'warning' });
      } else {
        // Wording follows G1: a mock acknowledgement is not "saved on the server".
        toast({
          message:
            s.source === 'mock'
              ? `Đã gửi ${s.applied} thao tác (máy chủ thử nghiệm MOCK).`
              : `Đã đồng bộ ${s.applied} thao tác.`,
          tone: 'success',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        data-testid="sync-chip"
        data-sync-state={state}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (compact && trigger.current) {
            const r = trigger.current.getBoundingClientRect();
            setFixedAt({ left: r.right + 8, bottom: window.innerHeight - r.bottom });
          }
          setOpen((v) => !v);
        }}
        className={`inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-xs font-medium text-fg hover:bg-[var(--state-hover)] ${compact ? 'w-7 px-0' : 'w-fit px-2.5'} before:absolute before:-inset-2 before:content-[''] relative`}
      >
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[state]}`} />
        {compact ? <span className="sr-only">{text}</span> : text}
        <span className="sr-only">
          {description !== text ? ` — ${description}` : ''} · Chi tiết đồng bộ
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="dialog"
        aria-label="Trạng thái đồng bộ"
        hidden={!open}
        data-testid="sync-popover"
        style={compact && fixedAt ? { left: fixedAt.left, bottom: fixedAt.bottom } : undefined}
        className={`z-40 w-64 rounded-card border border-line bg-surface p-4 text-sm shadow-lg ${compact ? 'fixed' : align === 'end' ? 'absolute right-0 top-full mt-2' : 'absolute bottom-full left-0 mb-2'}`}
      >
        <p className="mb-2 font-semibold text-fg">{text}</p>
        {localOnly && <p className="mb-2 text-fg-muted">{SYNC_DISABLED_MESSAGE}</p>}
        <dl className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-fg-muted">
          <dt>Mạng</dt>
          <dd className="text-fg">{online ? 'Trực tuyến' : 'Offline'}</dd>
          <dt>Chờ gửi</dt>
          <dd className="tabular-nums text-fg">{pending}</dd>
          <dt>Lỗi</dt>
          <dd className={`tabular-nums ${rejected > 0 ? 'text-error-text' : 'text-fg'}`}>
            {rejected}
          </dd>
          <dt>Lần cuối</dt>
          <dd className="text-fg">
            {lastSync ? new Date(lastSync.at).toLocaleTimeString('vi-VN') : '—'}
          </dd>
        </dl>
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          loading={busy}
          disabled={!online}
          onClick={() => void syncNowClicked()}
          data-testid="sync-popover-now"
        >
          Đồng bộ ngay
        </Button>
      </div>
    </div>
  );
}
