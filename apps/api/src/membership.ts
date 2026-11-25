/**
 * Membership gate (D-037/D-038, docs/ACCESS_CONTROL.md section 5). Fail closed: any lookup error
 * means "not a member" and never grants access.
 */
export interface Membership {
  status: 'pending' | 'active' | 'disabled';
  passwordChangeRequired: boolean;
  /** Epoch seconds; access tokens issued before this are revoked. */
  passwordChangedAt: number | null;
}

/** Returns null when the user has no membership row. Throws on lookup failure. */
export type MembershipStore = (userId: string) => Promise<Membership | null>;

/** Max staleness of a membership decision: disabling a member takes effect within this time. */
export const MEMBERSHIP_CACHE_TTL_MS = 60_000;

export function cachedMembership(
  inner: MembershipStore,
  opts: { ttlMs?: number; now?: () => number } = {},
): MembershipStore {
  const ttl = Math.min(opts.ttlMs ?? MEMBERSHIP_CACHE_TTL_MS, MEMBERSHIP_CACHE_TTL_MS);
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { at: number; value: Membership | null }>();
  return async (userId) => {
    const hit = cache.get(userId);
    if (hit && now() - hit.at < ttl) return hit.value;
    const value = await inner(userId); // errors are not cached
    if (cache.size > 10_000) cache.clear();
    cache.set(userId, { at: now(), value });
    return value;
  };
}

/** Reads app_members through PostgREST with the server-only secret key. */
export function supabaseMembership(opts: {
  url: string;
  secretKey: string;
  fetchImpl?: typeof fetch;
}): MembershipStore {
  const f = opts.fetchImpl ?? fetch;
  return async (userId) => {
    const u = new URL('/rest/v1/app_members', opts.url);
    u.searchParams.set('select', 'status,password_change_required,password_changed_at');
    u.searchParams.set('user_id', `eq.${userId}`);
    const headers: Record<string, string> = { apikey: opts.secretKey };
    if (opts.secretKey.startsWith('ey')) headers.authorization = `Bearer ${opts.secretKey}`;
    const res = await f(u, { headers, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`membership lookup failed (${res.status})`);
    const rows = (await res.json()) as Array<{
      status: Membership['status'];
      password_change_required: boolean;
      password_changed_at: string | null;
    }>;
    const r = rows[0];
    if (!r) return null;
    return {
      status: r.status,
      passwordChangeRequired: r.password_change_required,
      passwordChangedAt: r.password_changed_at
        ? Math.floor(new Date(r.password_changed_at).getTime() / 1000)
        : null,
    };
  };
}
