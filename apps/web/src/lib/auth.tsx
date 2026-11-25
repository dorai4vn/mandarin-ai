'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AUTH_CHANGED_EVENT,
  DEV_TOKEN_EVENT,
  hasStoredSession,
  readDevToken,
  supabase,
  tokenSubject,
  writeDevToken,
} from './session';

/**
 * Who is signed in (D-042). Source of truth: the official Supabase session (`onAuthStateChange`);
 * in dev/E2E builds a dev token can stand in. `userId` keys all local data (one IndexedDB per
 * account), so nothing personal is opened before it is known.
 */
export interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  userId: string | null;
  email: string | null;
  via: 'supabase' | 'dev' | null;
  /** Ends the session on this device (Supabase `signOut({ scope: 'local' })`, dev token cleared). */
  signOut: () => Promise<void>;
}

const SIGNED_OUT = { status: 'signed-out', userId: null, email: null, via: null } as const;
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'signOut'>>({
    status: 'loading',
    userId: null,
    email: null,
    via: null,
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const fromDevToken = () => {
      const token = readDevToken();
      const sub = token ? tokenSubject(token) : null;
      return sub
        ? ({ status: 'signed-in', userId: sub, email: null, via: 'dev' } as const)
        : SIGNED_OUT;
    };
    const subscribe = (sb: NonNullable<Awaited<ReturnType<typeof supabase>>>) => {
      if (unsubscribe || cancelled) return;
      // Sign-out, token refresh and changes made in other tabs.
      // Deferred: supabase-js must not be called re-entrantly from inside its own callback.
      const { data } = sb.auth.onAuthStateChange(() => void setTimeout(() => void resolve(), 0));
      unsubscribe = () => data.subscription.unsubscribe();
    };
    const resolve = async () => {
      // No stored session → do not even download the SDK (signed-out visitors, D-032 / G2).
      const sb = hasStoredSession() ? await supabase() : null;
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      if (cancelled) return;
      if (sb) subscribe(sb);
      setState(
        session
          ? {
              status: 'signed-in',
              userId: session.user.id,
              email: session.user.email ?? null,
              via: 'supabase',
            }
          : fromDevToken(),
      );
    };
    void resolve();
    const onChange = () => void resolve();
    window.addEventListener(DEV_TOKEN_EVENT, onChange);
    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    // Another tab signed in or out (supabase-js writes its session to localStorage).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || /^sb-.+-auth-token$/.test(e.key)) void resolve();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener(DEV_TOKEN_EVENT, onChange);
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const signOut = useCallback(async () => {
    const sb = hasStoredSession() ? await supabase() : null;
    // scope 'local' removes the session on this device before contacting the server, so it
    // works offline too; the request then revokes this device's refresh token.
    if (sb) await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
    if (readDevToken()) writeDevToken(null);
    setState(SIGNED_OUT);
  }, []);

  const value = useMemo(() => ({ ...state, signOut }), [state, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
