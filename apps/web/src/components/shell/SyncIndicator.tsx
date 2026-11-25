'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SYNC_DISABLED_MESSAGE, describeSyncResult } from '@/offline/sync-message';
import { useOffline } from '../OfflineProvider';
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
  const { state, text } = useSyncStatus();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // The popover is `fixed` beside / above the pill in the sidebar and rail, so the scrolling
  // sidebar (overflow) cannot clip it; kept in place on scroll and resize while open.
  const fixed = compact || align === 'start';
  const [fixedAt, setFixedAt] = useState<{ left: number; bottom: number } | null>(null);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const description =
    state === 'local-only'
      ? SYNC_DISABLED_MESSAGE
      : store?.kind === 'memory'
        ? 'Không có lưu trữ offline trên trình duyệt này.'
        : null;

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    setFixedAt(
      compact
        ? { left: r.right + 8, bottom: window.innerHeight - r.bottom }
        : { left: r.left, bottom: window.innerHeight - r.top + 8 },
    );
  }, [compact]);

  useEffect(() => {
    if (!open) return;
    const close = (refocus: boolean) => {
      setOpen(false);
      if (refocus) trigger.current?.focus();
    };
    // Esc only when focus is in the indicator (never swallow a page's Esc; IME-safe).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing) return;
      if (
        !root.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      )
        return;
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    // Tab away closes it (non-modal).
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null;
      if (to && !root.current?.contains(to)) close(false);
    };
    const node = root.current;
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    node?.addEventListener('focusout', onFocusOut);
    if (fixed) {
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
    }
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
      node?.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, fixed, place]);

  const syncNowClicked = async () => {
    if (!online || busy) return;
    setBusy(true);
    try {
      toast(describeSyncResult(await syncNow({ force: true })));
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
        aria-haspopup="dialog"
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (fixed) place();
          setOpen((v) => !v);
        }}
        className={`inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-xs font-medium text-fg hover:bg-[var(--state-hover)] ${compact ? 'w-7 px-0' : 'w-fit px-2.5'} before:absolute before:-inset-2 before:content-[''] relative`}
      >
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[state]}`} />
        {compact ? <span className="sr-only">{text}</span> : text}
        {description && <span className="sr-only"> — {description}</span>}
      </button>
      <div
        id={`${id}-panel`}
        role="dialog"
        aria-label="Trạng thái đồng bộ"
        hidden={!open}
        data-testid="sync-popover"
        style={fixed && fixedAt ? { left: fixedAt.left, bottom: fixedAt.bottom } : undefined}
        className={`z-40 w-64 max-w-[calc(100vw-1rem)] rounded-card border border-line bg-surface p-4 text-sm shadow-lg ${fixed ? 'fixed' : 'absolute right-0 top-full mt-2'}`}
      >
        <p className="mb-2 font-semibold text-fg">{text}</p>
        {description && <p className="mb-2 text-fg-muted">{description}</p>}
        <dl className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-fg-muted">
          <dt>Mạng</dt>
          <dd className="text-fg">{online ? 'Trực tuyến' : 'Offline'}</dd>
          <dt>Chờ gửi</dt>
          <dd className="tabular-nums text-fg">{pending}</dd>
          <dt>Lỗi</dt>
          <dd className={`tabular-nums ${rejected > 0 ? 'text-error-text' : 'text-fg'}`}>
            {rejected}
          </dd>
          <dt>Lần thử cuối</dt>
          <dd className="text-fg" data-testid="sync-popover-last">
            {lastSync
              ? `${new Date(lastSync.at).toLocaleTimeString('vi-VN')} · ${
                  lastSync.error || lastSync.rejected > 0
                    ? 'chưa xong'
                    : lastSync.source === 'live'
                      ? 'thành công'
                      : 'MOCK'
                }`
              : '—'}
          </dd>
        </dl>
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          loading={busy}
          // aria-disabled (not disabled): focus stays on the button when the device goes offline.
          aria-disabled={!online || undefined}
          aria-describedby={online ? undefined : `${id}-needs-net`}
          className={online ? '' : 'opacity-60'}
          onClick={() => void syncNowClicked()}
          data-testid="sync-popover-now"
        >
          Đồng bộ ngay
        </Button>
        {!online && (
          <p id={`${id}-needs-net`} className="mt-2 text-xs text-fg-muted">
            Cần có mạng để đồng bộ.
          </p>
        )}
      </div>
    </div>
  );
}
