import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
} from 'jose';
import type { AppConfig } from './config.js';

export interface AuthUser {
  id: string;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

export type AuthMode = 'jwks' | 'hs256';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASYMMETRIC = ['ES256', 'RS256'] as const;

/** Supabase Auth issuer: `<SUPABASE_URL>/auth/v1`. */
export function supabaseIssuer(supabaseUrl: string): string {
  return new URL('/auth/v1', supabaseUrl).toString();
}

/** Which verification methods this configuration enables (reported by /health, no secrets). */
export function authModes(config: AppConfig): AuthMode[] {
  const modes: AuthMode[] = [];
  if (config.SUPABASE_URL) modes.push('jwks');
  if (config.SUPABASE_JWT_SECRET) modes.push('hs256');
  return modes;
}

/**
 * Verifies Supabase Auth access tokens.
 *
 * Supabase projects sign user access tokens with either
 *  - asymmetric **JWT signing keys** (ES256/RS256; default for new projects) — verified with the
 *    public keys from `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (no secret needed), or
 *  - the **legacy JWT secret** (HS256) — verified only if SUPABASE_JWT_SECRET is configured.
 * During a key rotation both kinds can be valid at once, so the method is chosen per token from
 * its `alg` header, restricted to what is configured. `none`/other algorithms are rejected.
 *
 * Publishable (`sb_publishable_…`) and secret (`sb_secret_…`) API keys are NOT JWTs and are never
 * accepted here.
 */
export function createTokenVerifier(
  config: AppConfig,
  deps: { jwks?: JWTVerifyGetKey } = {},
): TokenVerifier {
  const issuer = config.SUPABASE_URL ? supabaseIssuer(config.SUPABASE_URL) : undefined;
  const jwks =
    deps.jwks ??
    (config.SUPABASE_URL
      ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', config.SUPABASE_URL), {
          cacheMaxAge: 10 * 60_000,
          cooldownDuration: 30_000,
          timeoutDuration: 5_000,
        })
      : null);
  const secret = config.SUPABASE_JWT_SECRET
    ? new TextEncoder().encode(config.SUPABASE_JWT_SECRET)
    : null;

  const common: JWTVerifyOptions = {
    audience: 'authenticated',
    clockTolerance: 30,
    requiredClaims: ['exp', 'sub'],
    ...(issuer ? { issuer } : {}),
  };

  return async (token) => {
    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new Error('Malformed token');
    }
    let payload: JWTPayload;
    if (alg === 'HS256') {
      if (!secret) throw new Error('HS256 tokens are not accepted by this configuration');
      ({ payload } = await jwtVerify(token, secret, { ...common, algorithms: ['HS256'] }));
    } else if (alg && (ASYMMETRIC as readonly string[]).includes(alg)) {
      if (!jwks) throw new Error('Asymmetric tokens need SUPABASE_URL (JWKS)');
      ({ payload } = await jwtVerify(token, jwks, { ...common, algorithms: [...ASYMMETRIC] }));
    } else {
      throw new Error('Unsupported token algorithm');
    }
    if (payload.role !== 'authenticated') throw new Error('Token is not a signed-in user');
    // Supabase anonymous sign-ins also carry role=authenticated; they are not learner accounts.
    if (payload.is_anonymous === true) throw new Error('Anonymous sessions are not accepted');
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) {
      throw new Error('Token subject is not a user id');
    }
    return { id: payload.sub };
  };
}
