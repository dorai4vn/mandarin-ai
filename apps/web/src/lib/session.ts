'use client';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
/** True when this build points at a Supabase project (publishable key only; RLS protects data). */
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);
/** Dev/E2E-only access token (sessionStorage). Never enabled in production builds by default. */
export const DEV_TOKEN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_TOKEN === 'true';
const DEV_TOKEN_KEY = 'mandarin.devAccessToken';
/** Fired on window when the dev token changes (AuthProvider listens). */
export const DEV_TOKEN_EVENT = 'mandarin:devtoken';

let client: Promise<SupabaseClient | null> | undefined;

/** Fired on window after a sign-in from this page (AuthProvider listens). */
export const AUTH_CHANGED_EVENT = 'mandarin:auth';

/**
 * True when supabase-js has a stored session on this device (its `sb-<ref>-auth-token` key).
 * Lets the app skip downloading the SDK entirely for signed-out visitors (D-032 / G2).
 */
export function hasStoredSession(): boolean {
  if (!SUPABASE_CONFIGURED) return false;
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch {
    return false;
  }
}

/**
 * Supabase client (official session handling: persisted in localStorage, auto refresh — D-042).
 * Loaded lazily so the SDK is not part of any route's first-load JavaScript (D-032 / G2).
 */
export function supabase(): Promise<SupabaseClient | null> {
  client ??= SUPABASE_CONFIGURED
    ? import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_KEY),
      )
    : Promise.resolve(null);
  return client;
}

export function readDevToken(): string | null {
  if (!DEV_TOKEN_ENABLED) return null;
  try {
    return sessionStorage.getItem(DEV_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeDevToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(DEV_TOKEN_KEY, token);
    else sessionStorage.removeItem(DEV_TOKEN_KEY);
  } catch {
    /* storage blocked: token lives only in memory for this page */
  }
  window.dispatchEvent(new Event(DEV_TOKEN_EVENT));
}

/** `sub` of a JWT WITHOUT verifying it — only to key local data; the API verifies tokens. */
export function tokenSubject(token: string): string | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: unknown;
    };
    return typeof json.sub === 'string' && /^[0-9a-f-]{36}$/i.test(json.sub) ? json.sub : null;
  } catch {
    return null;
  }
}

/** Access token for apps/api: the Supabase session first, else the dev token. */
export async function getAccessToken(): Promise<string | null> {
  const sb = hasStoredSession() ? await supabase() : null;
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  return readDevToken();
}
