import { SignJWT } from 'jose';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createTokenVerifier } from './auth.js';
import { loadConfig } from './config.js';
import { createProviders } from './providers.js';
import { FixedWindowLimiter } from './rate-limit.js';

const SECRET = 'test-secret-at-least-32-characters-long!!';
const USER = '11111111-2222-4333-8444-555555555555';

const config = loadConfig({
  NODE_ENV: 'test',
  SUPABASE_JWT_SECRET: SECRET,
  RATE_LIMIT_PER_MINUTE: '3',
});
const app = buildApp({
  config,
  verifyToken: createTokenVerifier(config),
  providers: createProviders(config),
});
afterAll(() => app.close());

async function token(claims: Record<string, unknown> = {}, secret = SECRET, sub = USER) {
  return new SignJWT({ role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
}

describe('config', () => {
  it('requires a JWT verification source and never allows mocks in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'test' })).toThrow(/SUPABASE_URL/);
    const prod = loadConfig({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://x.supabase.co',
      MISSING_PROVIDER_MODE: 'mock',
    });
    expect(prod.MISSING_PROVIDER_MODE).toBe('disabled');
    expect(createProviders(prod)).toEqual({ conversation: null, pronunciation: null });
  });

  it('reports invalid variable names without leaking values', () => {
    expect(() => loadConfig({ SUPABASE_JWT_SECRET: 'x', PORT: 'super-secret-value' })).toThrow(
      /PORT/,
    );
    try {
      loadConfig({ SUPABASE_JWT_SECRET: 'x', PORT: 'super-secret-value' });
    } catch (e) {
      expect(String(e)).not.toContain('super-secret-value');
    }
  });
});

describe('API', () => {
  it('GET /health reports provider modes honestly', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'ok',
      providers: { openaiRealtime: 'mock', azureSpeech: 'mock' },
    });
  });

  it('rejects missing, forged, wrong-audience and non-user tokens', async () => {
    const url = '/v1/voice/realtime-session';
    expect((await app.inject({ method: 'POST', url })).statusCode).toBe(401);
    const forged = await token({}, 'another-secret-that-is-also-32-chars-long');
    expect(
      (await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${forged}` } }))
        .statusCode,
    ).toBe(401);
    const anonSub = await token({}, SECRET, 'anon');
    expect(
      (await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${anonSub}` } }))
        .statusCode,
    ).toBe(401);
    const wrongAud = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER)
      .setAudience('service_role')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(SECRET));
    expect(
      (await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${wrongAud}` } }))
        .statusCode,
    ).toBe(401);
  });

  it('returns a MOCK-labelled realtime grant when no OpenAI key is configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/realtime-session',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ source: 'mock' });
  });

  it('validates the pronunciation contract and labels mock results', async () => {
    const auth = {
      authorization: `Bearer ${await token({}, SECRET, '22222222-2222-4333-8444-555555555555')}`,
    };
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/speech/pronunciation-assessment',
      headers: auth,
      payload: { referenceText: '' },
    });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({
      method: 'POST',
      url: '/v1/speech/pronunciation-assessment',
      headers: auth,
      payload: { referenceText: '山', locale: 'zh-CN', audioBase64: 'UklGRg==' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ source: 'mock', scores: { accuracy: null } });
  });

  it('returns 503 (not a mock) when providers are disabled', async () => {
    const cfg = loadConfig({
      NODE_ENV: 'test',
      SUPABASE_JWT_SECRET: SECRET,
      MISSING_PROVIDER_MODE: 'disabled',
    });
    const disabled = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    const res = await disabled.inject({
      method: 'POST',
      url: '/v1/voice/realtime-session',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(res.statusCode).toBe(503);
    await disabled.close();
  });

  it('rate-limits per user', async () => {
    const auth = {
      authorization: `Bearer ${await token({}, SECRET, '33333333-2222-4333-8444-555555555555')}`,
    };
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      codes.push(
        (await app.inject({ method: 'POST', url: '/v1/voice/realtime-session', headers: auth }))
          .statusCode,
      );
    }
    expect(codes).toEqual([200, 200, 200, 429]);
  });
});

describe('FixedWindowLimiter', () => {
  it('resets after the window', () => {
    let t = 0;
    const l = new FixedWindowLimiter(1, 1000, () => t);
    expect(l.take('a')).toBe(true);
    expect(l.take('a')).toBe(false);
    t = 1000;
    expect(l.take('a')).toBe(true);
  });
});
