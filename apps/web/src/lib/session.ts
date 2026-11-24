'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
/** Dev-only token field until M1 login ships. Never enabled in production builds by default. */
export const DEV_TOKEN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_TOKEN === 'true';
const DEV_TOKEN_KEY = 'mandarin.devAccessToken';

let client: SupabaseClient | null | undefined;

/** Supabase client with the publishable key only (RLS protects data). Null when not configured. */
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
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
}

/** Access token for apps/api: Supabase session first, else the dev token. */
export async function getAccessToken(): Promise<string | null> {
  const sb = supabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  }
  return readDevToken();
}
