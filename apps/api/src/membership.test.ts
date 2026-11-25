import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from './app.js';
import { createTokenVerifier } from './auth.js';
import { loadConfig } from './config.js';
import { cachedMembership, type Membership, type MembershipStore } from './membership.js';
import { createProviders } from './providers.js';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const USER = '11111111-2222-4333-8444-555555555555';
const config = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_JWT_SECRET: SECRET,
  HANDWRITING_ADAPTER: 'mock',
  RATE_LIMIT_PER_MINUTE: '100',
});

const tok = (iat = Math.floor(Date.now() / 1000)) =>
  new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER)
    .setAudience('authenticated')
    .setIssuedAt(iat)
    .setExpirationTime(Math.floor(Date.now() / 1000) + 300)
    .sign(new TextEncoder().encode(SECRET));

const m = (o: Partial<Membership> = {}): Membership => ({
  status: 'active',
  passwordChangeRequired: false,
  passwordChangedAt: null,
  ...o,
});

async function call(store: MembershipStore, url: string, iat?: number) {
  const app = buildApp({
    config,
    verifyToken: createTokenVerifier(config),
    providers: createProviders(config),
    membership: store,
  });
  const res = await app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${await tok(iat)}` },
  });
  await app.close();
  return res;
}

describe('membership gate', () => {
  const data = '/v1/uploads/pdf'; // any gated route; method mismatch would be 404, so use POST below
  it.each([
    ['no row', null],
    ['pending', m({ status: 'pending' })],
    ['disabled', m({ status: 'disabled' })],
  ])('403 not_a_member for %s on data routes', async (_n, mem) => {
    const app = buildApp({
      config,
      verifyToken: createTokenVerifier(config),
      providers: createProviders(config),
      membership: async () => mem,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/handwriting/recognize',
      headers: { authorization: `Bearer ${await tok()}` },
      payload: {},
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('not_a_member');
    void data;
  });

  it('403 password_change_required on data routes but /v1/me still answers', async () => {
    const store = async () => m({ passwordChangeRequired: true });
    const app = buildApp({
      config,
      verifyToken: createTokenVerifier(config),
      providers: createProviders(config),
      membership: store,
    });
    const headers = { authorization: `Bearer ${await tok()}` };
    const data = await app.inject({
      method: 'POST',
      url: '/v1/handwriting/recognize',
      headers,
      payload: {},
    });
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers });
    await app.close();
    expect(data.statusCode).toBe(403);
    expect(data.json().error.code).toBe('password_change_required');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ status: 'active', passwordChangeRequired: true });
  });

  it('/v1/me tells a pending user their status, but a user with no row gets 403', async () => {
    expect((await call(async () => m({ status: 'pending' }), '/v1/me')).json().status).toBe(
      'pending',
    );
    expect((await call(async () => null, '/v1/me')).statusCode).toBe(403);
  });

  it('401 session_revoked for tokens issued before password_changed_at', async () => {
    const now = Math.floor(Date.now() / 1000);
    const res = await call(async () => m({ passwordChangedAt: now }), '/v1/me', now - 100);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('session_revoked');
    const ok = await call(async () => m({ passwordChangedAt: now - 200 }), '/v1/me', now - 100);
    expect(ok.statusCode).toBe(200);
  });

  it('/v1/me does exactly one membership lookup per request', async () => {
    const store = vi.fn<MembershipStore>(async () => m());
    expect((await call(store, '/v1/me')).statusCode).toBe(200);
    expect(store).toHaveBeenCalledTimes(1);
  });

  it('a token without iat (0) is revoked once a password change is recorded', async () => {
    const res = await call(async () => m({ passwordChangedAt: 1 }), '/v1/me', 0);
    expect(res.statusCode).toBe(401);
  });

  it('fails closed (503, no data) when the membership lookup throws', async () => {
    const res = await call(async () => {
      throw new Error('db down');
    }, '/v1/me');
    expect(res.statusCode).toBe(503);
  });
});

describe('cachedMembership', () => {
  it('caches for at most 60 s, so a disabled member is blocked within the TTL', async () => {
    let t = 0;
    const inner = vi.fn(async () => m());
    const c = cachedMembership(inner, { ttlMs: 10 * 60_000, now: () => t });
    await c('u');
    await c('u');
    expect(inner).toHaveBeenCalledTimes(1);
    t = 60_000;
    await c('u');
    expect(inner).toHaveBeenCalledTimes(2);
  });
  it('does not cache failures', async () => {
    const inner = vi
      .fn<MembershipStore>()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue(m());
    const c = cachedMembership(inner);
    await expect(c('u')).rejects.toThrow();
    await expect(c('u')).resolves.toMatchObject({ status: 'active' });
  });
});
