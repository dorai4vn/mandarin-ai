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
  HANDWRITING_ADAPTER: 'mock',
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
    expect(createProviders(prod)).toEqual({
      conversation: null,
      pronunciation: null,
      handwriting: null,
      storage: null,
      sync: null,
    });
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

describe('cross-platform web endpoints', () => {
  const auth = async (sub: string) => ({ authorization: `Bearer ${await token({}, SECRET, sub)}` });

  it('allows CORS only for configured web origins', async () => {
    const ok = await app.inject({
      method: 'OPTIONS',
      url: '/v1/sync/push',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'POST' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const evil = await app.inject({
      method: 'OPTIONS',
      url: '/v1/sync/push',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('recognizes handwriting via the configured adapter (mock here) and validates input', async () => {
    const h = await auth('44444444-2222-4333-8444-555555555555');
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/handwriting/recognize',
      headers: h,
      payload: { strokes: [] },
    });
    expect(bad.statusCode).toBe(400);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/handwriting/recognize',
      headers: h,
      payload: { strokes: [{ points: [{ x: 1, y: 2, t: 0 }] }], pointerType: 'mouse' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ source: 'mock', adapterId: 'mock' });
  });

  it('applies a sync operation exactly once and rejects reuse of its id by another user', async () => {
    const op = {
      operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0B',
      deviceId: 'device-12345678',
      entityType: 'spike_note',
      opType: 'create',
      schemaVersion: 1,
      logicalClock: 1,
      occurredAt: '2026-11-23T10:00:00+07:00',
      payload: { text: '山' },
    };
    const a = await auth('55555555-2222-4333-8444-555555555555');
    const first = await app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      headers: a,
      payload: { operations: [op] },
    });
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      headers: a,
      payload: { operations: [op] },
    });
    expect(first.json().results[0].status).toBe('applied');
    expect(replay.json().results[0].status).toBe('duplicate');
    expect(replay.json().source).toBe('mock');
    const b = await auth('66666666-2222-4333-8444-555555555555');
    const other = await app.inject({
      method: 'POST',
      url: '/v1/sync/push',
      headers: b,
      payload: { operations: [op] },
    });
    expect(other.json().results[0].status).toBe('rejected');

    // Pull: each user sees only their own operations; the cursor advances.
    const pullA = await app.inject({ method: 'GET', url: '/v1/sync/pull?after=0', headers: a });
    expect(pullA.statusCode).toBe(200);
    expect(pullA.json().operations.map((o: { operationId: string }) => o.operationId)).toEqual([
      op.operationId,
    ]);
    expect(pullA.json().nextAfter).toBe(pullA.json().operations[0].serverSeq);
    const again = await app.inject({
      method: 'GET',
      url: `/v1/sync/pull?after=${pullA.json().nextAfter}`,
      headers: a,
    });
    expect(again.json()).toMatchObject({ operations: [], hasMore: false });
    const pullB = await app.inject({ method: 'GET', url: '/v1/sync/pull', headers: b });
    expect(pullB.json().operations).toEqual([]);
  });

  it('sync pull requires a valid token and validates the query', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/sync/pull' })).statusCode).toBe(401);
    const a = await auth('55555555-2222-4333-8444-555555555555');
    for (const q of ['after=-1', 'limit=0', 'limit=501', 'after=abc'])
      expect(
        (await app.inject({ method: 'GET', url: `/v1/sync/pull?${q}`, headers: a })).statusCode,
        q,
      ).toBe(400);
  });

  it('accepts real PDFs only, at a server-chosen private path', async () => {
    const h = await auth('77777777-2222-4333-8444-555555555555');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const ok = await app.inject({
      method: 'POST',
      url: '/v1/uploads/pdf',
      headers: { ...h, 'content-type': 'application/pdf' },
      payload: pdf,
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().storagePath).toMatch(
      /^77777777-2222-4333-8444-555555555555\/imports\/[0-9a-f-]{36}\.pdf$/,
    );
    expect(ok.json().source).toBe('mock');
    const fake = await app.inject({
      method: 'POST',
      url: '/v1/uploads/pdf',
      headers: { ...h, 'content-type': 'application/pdf' },
      payload: Buffer.from('<html>not a pdf</html>'),
    });
    expect(fake.statusCode).toBe(422);
    const wrongType = await app.inject({
      method: 'POST',
      url: '/v1/uploads/pdf',
      headers: { ...h, 'content-type': 'text/plain' },
      payload: 'hello',
    });
    expect(wrongType.statusCode).toBe(415);
  });
});

describe('PDF upload limit 50 MB (D-040)', () => {
  const MiB = 1024 * 1024;
  const auth = async () => ({
    authorization: `Bearer ${await token({}, SECRET, '88888888-2222-4333-8444-555555555555')}`,
  });
  const pdfOf = (size: number) => {
    const b = Buffer.alloc(size);
    b.write('%PDF-1.7\n', 0, 'latin1');
    return b;
  };
  const upload = async (payload: Buffer, headers: Record<string, string>) =>
    app.inject({
      method: 'POST',
      url: '/v1/uploads/pdf',
      headers: { ...headers, 'content-type': 'application/pdf' },
      payload,
    });

  it.each([
    ['20 MB', 20 * MiB],
    ['49 MB', 49 * MiB],
    ['exactly 50 MB', 50 * MiB],
  ])('accepts a %s PDF and reports its exact size', async (_label, size) => {
    const res = await upload(pdfOf(size), await auth());
    expect(res.statusCode).toBe(201);
    expect(res.json().sizeBytes).toBe(size);
  });

  it('rejects 50 MB + 1 byte with 413 payload_too_large (client-side check cannot be bypassed)', async () => {
    const res = await upload(pdfOf(50 * MiB + 1), await auth());
    expect(res.statusCode).toBe(413);
    expect(res.json()).toEqual({
      error: { code: 'payload_too_large', message: expect.any(String) },
    });
  });

  it('rejects a 49 MB file that is not a PDF with 422', async () => {
    const res = await upload(Buffer.alloc(49 * MiB, 0x41), await auth());
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('not_a_pdf');
  });

  it('refuses anonymous uploads with 401 before reading the body', async () => {
    const res = await upload(pdfOf(50 * MiB + 1), {});
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthenticated');
  });
});

describe('deployment safety (APP_ENV, D-029, preview)', () => {
  const base = { SUPABASE_JWT_SECRET: SECRET, SUPABASE_URL: 'https://x.supabase.co' };

  it('treats containers (NODE_ENV=production) as production unless APP_ENV says otherwise', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'production' }).appEnv).toBe('production');
    expect(loadConfig({ ...base, NODE_ENV: 'production', APP_ENV: 'preview' }).appEnv).toBe(
      'preview',
    );
  });

  it('refuses the unapproved HanziLookup adapter in production and preview (D-029)', () => {
    expect(() =>
      loadConfig({ ...base, NODE_ENV: 'production', HANDWRITING_ADAPTER: 'hanzilookup' }),
    ).toThrow(/D-029/);
    expect(() =>
      loadConfig({ ...base, APP_ENV: 'preview', HANDWRITING_ADAPTER: 'hanzilookup' }),
    ).toThrow(/D-029/);
    expect(() =>
      loadConfig({ ...base, APP_ENV: 'development', HANDWRITING_ADAPTER: 'hanzilookup' }),
    ).not.toThrow();
  });

  it('disables mocks in preview unless explicitly allowed', () => {
    const closed = loadConfig({ ...base, APP_ENV: 'preview', NODE_ENV: 'production' });
    expect(closed.MISSING_PROVIDER_MODE).toBe('disabled');
    expect(createProviders(closed).sync).toBeNull();
    const open = loadConfig({
      ...base,
      APP_ENV: 'preview',
      NODE_ENV: 'production',
      ALLOW_MOCKS_IN_PREVIEW: 'true',
    });
    expect(open.MISSING_PROVIDER_MODE).toBe('mock');
    // Even with mocks allowed, preview never keeps learner data in RAM (stateful mocks).
    const previewProviders = createProviders(open);
    expect(previewProviders.sync).toBeNull();
    expect(previewProviders.storage).toBeNull();
    expect(previewProviders.pronunciation?.mode).toBe('mock');
    expect(() => loadConfig({ ...base, APP_ENV: 'preview', HANDWRITING_ADAPTER: 'mock' })).toThrow(
      /mocks/,
    );
  });

  it('defaults handwriting to disabled (no implicit HanziLookup)', () => {
    expect(
      createProviders(loadConfig({ ...base, NODE_ENV: 'test', HANDWRITING_DATA_PATH: '/x' }))
        .handwriting,
    ).toBeNull();
  });

  it('accepts preview origins only through an anchored https regex', async () => {
    expect(() => loadConfig({ ...base, WEB_ORIGIN_REGEX: '.*' })).toThrow(/anchored/);
    const cfg = loadConfig({
      ...base,
      NODE_ENV: 'test',
      WEB_ORIGIN_REGEX: '^https://mandarin-ai-[a-z0-9-]+-team\\.vercel\\.app$',
    });
    const a = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    const ok = await a.inject({
      method: 'OPTIONS',
      url: '/v1/sync/push',
      headers: {
        origin: 'https://mandarin-ai-git-x-team.vercel.app',
        'access-control-request-method': 'POST',
      },
    });
    expect(ok.headers['access-control-allow-origin']).toBe(
      'https://mandarin-ai-git-x-team.vercel.app',
    );
    const bad = await a.inject({
      method: 'OPTIONS',
      url: '/v1/sync/push',
      headers: {
        origin: 'https://mandarin-ai-git-x-attacker.vercel.app',
        'access-control-request-method': 'POST',
      },
    });
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    await a.close();
  });

  it('limits requests per IP before authentication', async () => {
    const cfg = loadConfig({ ...base, NODE_ENV: 'test', IP_RATE_LIMIT_PER_MINUTE: '10' });
    const a = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    const codes: number[] = [];
    for (let i = 0; i < 11; i++)
      codes.push((await a.inject({ method: 'GET', url: '/health' })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
    await a.close();
  });

  // FU-7 (issue #6): a 429 without CORS headers is unreadable for the browser — fetch() rejects
  // and the web app shows "cannot reach the API" instead of "too many requests".
  it('IP rate-limit responses carry CORS headers for allowed origins only', async () => {
    const cfg = loadConfig({ ...base, NODE_ENV: 'test', IP_RATE_LIMIT_PER_MINUTE: '10' });
    const a = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    for (let i = 0; i < 10; i++) await a.inject({ method: 'GET', url: '/health' });
    const allowed = await a.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(allowed.statusCode).toBe(429);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(String(allowed.headers.vary)).toMatch(/Origin/);
    expect(allowed.json()).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests' },
    });
    const foreign = await a.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.statusCode).toBe(429);
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    await a.close();
  });

  // FU-7: POST/upload calls need a CORS preflight. A rate-limited preflight (non-2xx, no
  // Allow-Methods/Headers) fails in the browser exactly like a network error, so preflights are
  // answered by CORS before the IP guard; the actual request then gets a readable 429.
  it('answers CORS preflights even when the IP limit is reached; the request gets a readable 429', async () => {
    const cfg = loadConfig({ ...base, NODE_ENV: 'test', IP_RATE_LIMIT_PER_MINUTE: '10' });
    const a = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    for (let i = 0; i < 10; i++) await a.inject({ method: 'GET', url: '/health' });
    const origin = 'http://localhost:3000';
    const pre = await a.inject({
      method: 'OPTIONS',
      url: '/v1/uploads/pdf',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(pre.statusCode).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(origin);
    expect(String(pre.headers['access-control-allow-methods'])).toMatch(/POST/);
    expect(String(pre.headers['access-control-allow-headers']).toLowerCase()).toMatch(
      /authorization/,
    );
    const post = await a.inject({
      method: 'POST',
      url: '/v1/uploads/pdf',
      headers: { origin, 'content-type': 'application/pdf' },
      payload: Buffer.from('%PDF-1.4'),
    });
    expect(post.statusCode).toBe(429);
    expect(post.headers['access-control-allow-origin']).toBe(origin);
    expect(post.json().error.code).toBe('rate_limited');
    // A disallowed origin still gets no CORS grant on the preflight.
    const foreign = await a.inject({
      method: 'OPTIONS',
      url: '/v1/uploads/pdf',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    await a.close();
  });
  // FU-7 follow-up: preflights bypass the IP guard (so they stay answerable), hence they get
  // their own per-IP limiter registered before CORS. Flooding it must not break real requests.
  it('limits a preflight flood separately; real requests and their readable 429 are unaffected', async () => {
    const cfg = loadConfig({ ...base, NODE_ENV: 'test', IP_RATE_LIMIT_PER_MINUTE: '10' });
    const a = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    const origin = 'http://localhost:3000';
    const preflight = (o: string) =>
      a.inject({
        method: 'OPTIONS',
        url: '/v1/uploads/pdf',
        headers: { origin: o, 'access-control-request-method': 'POST' },
      });
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await preflight(origin)).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 204)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
    // Unknown origins are limited too (and never granted CORS).
    const foreign = await preflight('https://evil.example');
    expect(foreign.statusCode).toBe(429);
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    // The flood did not consume the real-request budget: 10 real calls still pass...
    for (let i = 0; i < 10; i++) {
      const r = await a.inject({ method: 'GET', url: '/health', headers: { origin } });
      expect(r.statusCode).toBe(200);
    }
    // ...and the 11th is a 429 the browser can read.
    const limited = await a.inject({ method: 'GET', url: '/health', headers: { origin } });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['access-control-allow-origin']).toBe(origin);
    expect(limited.json().error.code).toBe('rate_limited');
    // Real traffic does not consume the preflight budget either (fresh app, 10 real calls).
    const b = buildApp({
      config: cfg,
      verifyToken: createTokenVerifier(cfg),
      providers: createProviders(cfg),
    });
    for (let i = 0; i < 11; i++) await b.inject({ method: 'GET', url: '/health' });
    const pre = await b.inject({
      method: 'OPTIONS',
      url: '/v1/uploads/pdf',
      headers: { origin, 'access-control-request-method': 'POST' },
    });
    expect(pre.statusCode).toBe(204);
    await a.close();
    await b.close();
  });
});
