import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  UnsecuredJWT,
  type CryptoKey,
  type JWK,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authModes, createTokenVerifier, supabaseIssuer } from './auth.js';
import { loadConfig } from './config.js';

const USER = '11111111-2222-4333-8444-555555555555';
const SUPABASE = 'https://abcd1234.supabase.co';
const ISS = supabaseIssuer(SUPABASE);
const HS_SECRET = 'legacy-hs256-secret-at-least-32-characters!!';

let es: { privateKey: CryptoKey; jwk: JWK };
let other: { privateKey: CryptoKey };

beforeAll(async () => {
  const kp = await generateKeyPair('ES256');
  es = {
    privateKey: kp.privateKey,
    jwk: { ...(await exportJWK(kp.publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' },
  };
  other = { privateKey: (await generateKeyPair('ES256')).privateKey };
});

function es256(
  claims: Record<string, unknown> = {},
  opts: { iss?: string; key?: CryptoKey; kid?: string; exp?: string } = {},
) {
  return new SignJWT({ role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'ES256', kid: opts.kid ?? 'k1' })
    .setSubject(USER)
    .setAudience('authenticated')
    .setIssuer(opts.iss ?? ISS)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(opts.key ?? es.privateKey);
}

function hs256(claims: Record<string, unknown> = {}) {
  return new SignJWT({ role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER)
    .setAudience('authenticated')
    .setIssuer(ISS)
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(HS_SECRET));
}

describe('Supabase JWT verification (asymmetric signing keys / JWKS)', () => {
  const cfg = () => loadConfig({ NODE_ENV: 'test', SUPABASE_URL: SUPABASE });
  const verifier = () =>
    createTokenVerifier(cfg(), { jwks: createLocalJWKSet({ keys: [es.jwk] }) });

  it('accepts an ES256 user token signed by a key from the JWKS', async () => {
    await expect(verifier()(await es256())).resolves.toEqual({ id: USER });
    expect(authModes(cfg())).toEqual(['jwks']);
  });

  it('rejects wrong issuer, unknown key, expired, anon role and missing exp', async () => {
    const v = verifier();
    await expect(v(await es256({}, { iss: 'https://evil.supabase.co/auth/v1' }))).rejects.toThrow();
    await expect(v(await es256({}, { key: other.privateKey }))).rejects.toThrow();
    await expect(v(await es256({}, { exp: '-1m' }))).rejects.toThrow();
    await expect(v(await es256({ role: 'anon' }))).rejects.toThrow(/signed-in user/);
    const noExp = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject(USER)
      .setAudience('authenticated')
      .setIssuer(ISS)
      .sign(es.privateKey);
    await expect(v(noExp)).rejects.toThrow();
  });

  it('rejects Supabase anonymous sessions (role=authenticated, is_anonymous=true)', async () => {
    await expect(verifier()(await es256({ is_anonymous: true }))).rejects.toThrow(/Anonymous/);
    await expect(verifier()(await es256({ is_anonymous: false }))).resolves.toEqual({ id: USER });
  });

  it('rejects a service_role token and a wrong audience', async () => {
    await expect(verifier()(await es256({ role: 'service_role' }))).rejects.toThrow();
    const wrongAud = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject(USER)
      .setAudience('anon')
      .setIssuer(ISS)
      .setExpirationTime('5m')
      .sign(es.privateKey);
    await expect(verifier()(wrongAud)).rejects.toThrow();
  });

  it('rejects an HS256 token forged with the public JWK as HMAC key (alg confusion)', async () => {
    const forged = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER)
      .setAudience('authenticated')
      .setIssuer(ISS)
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(JSON.stringify(es.jwk)));
    await expect(verifier()(forged)).rejects.toThrow(/HS256/);
  });

  it('rejects HS256 tokens when no legacy secret is configured, and alg=none always', async () => {
    const v = verifier();
    await expect(v(await hs256())).rejects.toThrow(/HS256/);
    const none = new UnsecuredJWT({
      role: 'authenticated',
      sub: USER,
      aud: 'authenticated',
    }).encode();
    await expect(v(none)).rejects.toThrow(/Unsupported/);
  });

  it('never accepts API keys (publishable/secret keys are not JWTs)', async () => {
    const v = verifier();
    await expect(v('sb_publishable_fake')).rejects.toThrow(/Malformed/);
    await expect(v('sb_secret_fake')).rejects.toThrow(/Malformed/);
  });
});

describe('key rotation: legacy HS256 secret + asymmetric keys at the same time', () => {
  it('accepts both kinds, chosen per token', async () => {
    const cfg = loadConfig({
      NODE_ENV: 'test',
      SUPABASE_URL: SUPABASE,
      SUPABASE_JWT_SECRET: HS_SECRET,
    });
    expect(authModes(cfg)).toEqual(['jwks', 'hs256']);
    const v = createTokenVerifier(cfg, { jwks: createLocalJWKSet({ keys: [es.jwk] }) });
    await expect(v(await es256())).resolves.toEqual({ id: USER });
    await expect(v(await hs256())).resolves.toEqual({ id: USER });
  });
});

describe('remote JWKS endpoint (<SUPABASE_URL>/auth/v1/.well-known/jwks.json)', () => {
  let server: Server;
  let base = '';
  const hits: string[] = [];
  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url ?? '');
      if (req.url === '/auth/v1/.well-known/jwks.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ keys: [es.jwk] }));
      } else {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('fetches the project JWKS from the documented path and verifies with the project issuer', async () => {
    const cfg = loadConfig({ NODE_ENV: 'test', SUPABASE_URL: base });
    const v = createTokenVerifier(cfg);
    const token = await es256({}, { iss: supabaseIssuer(base) });
    await expect(v(token)).resolves.toEqual({ id: USER });
    await expect(v(token)).resolves.toEqual({ id: USER }); // served from cache
    expect(hits.filter((h) => h === '/auth/v1/.well-known/jwks.json')).toHaveLength(1);
  });
});

describe('Supabase configuration guards', () => {
  it('requires SUPABASE_URL (issuer check) outside development, even with an HS256 secret', () => {
    expect(() =>
      loadConfig({ APP_ENV: 'preview', NODE_ENV: 'production', SUPABASE_JWT_SECRET: HS_SECRET }),
    ).toThrow(/SUPABASE_URL is required/);
  });

  it('requires https for SUPABASE_URL outside development', () => {
    expect(() =>
      loadConfig({
        APP_ENV: 'preview',
        NODE_ENV: 'production',
        SUPABASE_URL: 'http://x.supabase.co',
      }),
    ).toThrow(/https/);
    expect(() =>
      loadConfig({ NODE_ENV: 'test', SUPABASE_URL: 'http://127.0.0.1:54321' }),
    ).not.toThrow();
  });

  it('accepts SUPABASE_SECRET_KEY (or the legacy alias) and refuses a publishable key there', () => {
    expect(
      loadConfig({ NODE_ENV: 'test', SUPABASE_URL: SUPABASE, SUPABASE_SECRET_KEY: 'sb_secret_x' })
        .supabaseSecretKey,
    ).toBe('sb_secret_x');
    expect(
      loadConfig({
        NODE_ENV: 'test',
        SUPABASE_URL: SUPABASE,
        SUPABASE_SERVICE_ROLE_KEY: 'eyJlegacy',
      }).supabaseSecretKey,
    ).toBe('eyJlegacy');
    expect(() =>
      loadConfig({
        NODE_ENV: 'test',
        SUPABASE_URL: SUPABASE,
        SUPABASE_SECRET_KEY: 'sb_publishable_x',
      }),
    ).toThrow(/publishable/);
  });
});
