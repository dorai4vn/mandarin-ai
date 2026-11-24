'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, isProviderUnavailable } from '@/lib/api-client';
import { openLocalStore, type LocalStore } from '@/offline/store';
import { SyncEngine, type SyncSummary } from '@/offline/sync';
import { SyncAvailabilityProbe, type SyncAvailability } from '@/offline/sync-availability';

/** Shown wherever sync status appears while cloud sync is not enabled on the server (M0). */
export const SYNC_DISABLED_MESSAGE =
  'Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt.';

interface OfflineState {
  store: LocalStore | null;
  online: boolean;
  pending: number;
  /** Operations the server refused — shown as an error, never as "synced" (G1). */
  rejected: number;
  lastSync: (SyncSummary & { at: string }) | null;
  /** Whether the server has cloud sync enabled (from GET /health; 'unknown' until probed). */
  syncAvailability: SyncAvailability;
  refresh: () => Promise<void>;
  /** `force` re-checks the server's sync status first (manual "sync now", back online). */
  syncNow: (opts?: { force?: boolean }) => Promise<SyncSummary | null>;
}

const Ctx = createContext<OfflineState | null>(null);

/**
 * Opens the local store (IndexedDB or memory fallback) and runs sync on open, `online`,
 * tab becoming visible and every 30 s while visible (no Background Sync assumed, D-021).
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LocalStore | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [lastSync, setLastSync] = useState<OfflineState['lastSync']>(null);
  const [syncAvailability, setSyncAvailability] = useState<SyncAvailability>('unknown');
  const engine = useRef<SyncEngine | null>(null);
  const probe = useRef<SyncAvailabilityProbe | null>(null);

  const refresh = useCallback(async () => {
    if (!store) return;
    const outbox = await store.listOutbox();
    setPending(outbox.filter((e) => e.status === 'pending').length);
    setRejected(outbox.filter((e) => e.status === 'rejected').length);
  }, [store]);

  const syncNow = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!engine.current || !navigator.onLine) return null;
      const s = await engine.current.syncNow(opts);
      // "Sync not enabled / status unknown" is not an attempt and not an error: no lastSync entry.
      const notAttempted = s.error === 'sync_unavailable' || s.error === 'sync_status_unknown';
      if (s.applied + s.duplicate + s.rejected + s.retried > 0 || (s.error && !notAttempted))
        setLastSync({ ...s, at: new Date().toISOString() });
      await refresh();
      return s;
    },
    [refresh],
  );

  useEffect(() => {
    let cancelled = false;
    void openLocalStore().then((s) => {
      if (cancelled) return;
      // Dev/E2E builds only: accept acknowledgements from the in-memory MOCK sync server.
      const acceptMock = process.env.NEXT_PUBLIC_ALLOW_MOCK_SYNC === 'true';
      const p = new SyncAvailabilityProbe(() => api.health(), { acceptMock });
      p.onChange(setSyncAvailability);
      probe.current = p;
      engine.current = new SyncEngine(s, (ops) => api.syncPush(ops), undefined, acceptMock, {
        check: (force) => p.check(force),
        markUnavailable: () => p.markUnavailable(),
        isUnavailableError: isProviderUnavailable,
      });
      // One GET /health (always 200) so the UI can say whether cloud sync exists at all.
      if (navigator.onLine) void p.check();
      setStore(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!store) return;
    // External-system sync: browser online state and visibility drive sync attempts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    void refresh().then(() => syncNow());
    const onOnline = () => {
      setOnline(true);
      void syncNow({ force: true });
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, 30_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [store, refresh, syncNow]);

  const value = useMemo(
    () => ({ store, online, pending, rejected, lastSync, syncAvailability, refresh, syncNow }),
    [store, online, pending, rejected, lastSync, syncAvailability, refresh, syncNow],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOffline outside OfflineProvider');
  return v;
}
