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
import { useAuth } from '@/lib/auth';
import { localDbName, openLocalStore, type LocalStore } from '@/offline/store';
import { SyncEngine, type SyncSummary } from '@/offline/sync';
import { SyncAvailabilityProbe, type SyncAvailability } from '@/offline/sync-availability';

import type { SyncResult } from '@/offline/sync-message';
export { SYNC_DISABLED_MESSAGE } from '@/offline/sync-message';
export type { SyncResult } from '@/offline/sync-message';

interface OfflineState {
  /** The signed-in account's local store; null while signed out (nothing personal is open). */
  store: LocalStore | null;
  /** True when someone is signed in (local data and sync exist). */
  signedIn: boolean;
  online: boolean;
  pending: number;
  /** Operations the server refused — shown as an error, never as "synced" (G1). */
  rejected: number;
  lastSync: (SyncSummary & { at: string }) | null;
  /** Whether the server has cloud sync enabled (from GET /health; 'unknown' until probed). */
  syncAvailability: SyncAvailability;
  refresh: () => Promise<void>;
  /**
   * `force` re-checks the server's sync status first (manual "sync now", back online). The result
   * carries the state AFTER the run (`after`), so callers report what is true now, not only what
   * this run did (G1: another tab may hold the sync lock, the outbox may be empty, sync may be off).
   */
  syncNow: (opts?: { force?: boolean }) => Promise<SyncResult | null>;
  /** Sign-out (D-042): closes and DELETES the current account's local database. */
  forgetLocalData: () => Promise<void>;
}

const Ctx = createContext<OfflineState | null>(null);

/**
 * Local data and sync for the signed-in account (D-021, D-042). One IndexedDB per account
 * (`mandarin-ai:<userId>`), opened only after sign-in; switching accounts closes the previous one
 * and resets every in-memory counter before the next account's database is opened. Sync runs on
 * open, `online`, the tab becoming visible and every 30 s while visible (no Background Sync).
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [store, setStore] = useState<LocalStore | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [lastSync, setLastSync] = useState<OfflineState['lastSync']>(null);
  const [syncAvailability, setSyncAvailability] = useState<SyncAvailability>('unknown');
  const engine = useRef<SyncEngine | null>(null);
  const probe = useRef<SyncAvailabilityProbe | null>(null);
  // Dev/E2E builds only: accept acknowledgements from the in-memory MOCK sync server.
  const acceptMock = process.env.NEXT_PUBLIC_ALLOW_MOCK_SYNC === 'true';

  // Network state and the server's sync availability do not depend on who is signed in.
  useEffect(() => {
    const p = new SyncAvailabilityProbe(() => api.health(), { acceptMock });
    p.onChange(setSyncAvailability);
    probe.current = p;
    // One GET /health (always 200) so the UI can say whether cloud sync exists at all.
    if (navigator.onLine) void p.check();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [acceptMock]);

  // The account's database: opened for this userId only, closed on change/sign-out.
  useEffect(() => {
    // Reset first: nothing of the previous account may remain visible.
    engine.current = null;
    /* eslint-disable react-hooks/set-state-in-effect */
    setStore(null);
    setPending(0);
    setRejected(0);
    setLastSync(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!userId) return;
    let cancelled = false;
    let opened: LocalStore | null = null;
    void openLocalStore(localDbName(userId)).then((s) => {
      if (cancelled) return s.close();
      opened = s;
      const p = probe.current!;
      engine.current = new SyncEngine(
        s,
        (ops) => api.syncPush(ops),
        undefined,
        acceptMock,
        {
          check: (force) => p.check(force),
          markUnavailable: () => p.markUnavailable(),
          isUnavailableError: isProviderUnavailable,
        },
        { pull: (after) => api.syncPull(after), lockName: `mandarin-sync:${userId}` },
      );
      setStore(s);
    });
    return () => {
      cancelled = true;
      engine.current = null;
      opened?.close();
    };
  }, [userId, acceptMock]);

  const count = useCallback(async () => {
    if (!store) return { pending: 0, rejected: 0 };
    const outbox = await store.listOutbox();
    const c = {
      pending: outbox.filter((e) => e.status === 'pending').length,
      rejected: outbox.filter((e) => e.status === 'rejected').length,
    };
    setPending(c.pending);
    setRejected(c.rejected);
    return c;
  }, [store]);
  const refresh = useCallback(async () => {
    await count();
  }, [count]);

  const syncNow = useCallback(
    async (opts: { force?: boolean } = {}) => {
      const e = engine.current;
      if (!e || !navigator.onLine) return null;
      const s = await e.syncNow(opts);
      if (engine.current !== e) return null; // account changed meanwhile: report nothing
      // "Sync not enabled / status unknown" is not an attempt and not an error: no lastSync entry.
      const notAttempted = s.error === 'sync_unavailable' || s.error === 'sync_status_unknown';
      if (
        s.applied + s.duplicate + s.rejected + s.retried + s.pulled > 0 ||
        (s.error && !notAttempted)
      )
        setLastSync({ ...s, at: new Date().toISOString() });
      const c = await count();
      return { ...s, after: { ...c, availability: probe.current?.current ?? 'unknown' } };
    },
    [count],
  );

  const forgetLocalData = useCallback(async () => {
    const s = store;
    engine.current = null;
    setStore(null);
    setPending(0);
    setRejected(0);
    setLastSync(null);
    await s?.destroy();
  }, [store]);

  useEffect(() => {
    if (!store) return;
    // External-system sync: open, `online`, visibility and a timer drive sync attempts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().then(() => syncNow());
    const onOnline = () => void syncNow({ force: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, 30_000);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [store, refresh, syncNow]);

  const value = useMemo(
    () => ({
      store,
      signedIn: Boolean(userId),
      online,
      pending,
      rejected,
      lastSync,
      syncAvailability,
      refresh,
      syncNow,
      forgetLocalData,
    }),
    [
      store,
      userId,
      online,
      pending,
      rejected,
      lastSync,
      syncAvailability,
      refresh,
      syncNow,
      forgetLocalData,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOffline outside OfflineProvider');
  return v;
}
