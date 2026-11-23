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
import { api } from '@/lib/api-client';
import { openLocalStore, type LocalStore } from '@/offline/store';
import { SyncEngine, type SyncSummary } from '@/offline/sync';

interface OfflineState {
  store: LocalStore | null;
  online: boolean;
  pending: number;
  lastSync: (SyncSummary & { at: string }) | null;
  refresh: () => Promise<void>;
  syncNow: () => Promise<SyncSummary | null>;
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
  const [lastSync, setLastSync] = useState<OfflineState['lastSync']>(null);
  const engine = useRef<SyncEngine | null>(null);

  const refresh = useCallback(async () => {
    if (!store) return;
    setPending((await store.listOutbox()).filter((e) => e.status === 'pending').length);
  }, [store]);

  const syncNow = useCallback(async () => {
    if (!engine.current || !navigator.onLine) return null;
    const s = await engine.current.syncNow();
    if (s.applied + s.duplicate + s.rejected + s.retried > 0 || s.error)
      setLastSync({ ...s, at: new Date().toISOString() });
    await refresh();
    return s;
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    void openLocalStore().then((s) => {
      if (cancelled) return;
      engine.current = new SyncEngine(s, (ops) => api.syncPush(ops));
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
      void syncNow();
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
    () => ({ store, online, pending, lastSync, refresh, syncNow }),
    [store, online, pending, lastSync, refresh, syncNow],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOffline outside OfflineProvider');
  return v;
}
