import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AppConfig } from './config.js';

export interface AuthUser {
  id: string;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifies Supabase access tokens. Uses the project's JWKS (asymmetric keys) when
 * SUPABASE_URL is set; falls back to the HS256 secret for local/legacy setups.
 */
export function createTokenVerifier(config: AppConfig): TokenVerifier {
  let key: JWTVerifyGetKey | Uint8Array;
  let algorithms: string[];
  if (config.SUPABASE_JWT_SECRET) {
    key = new TextEncoder().encode(config.SUPABASE_JWT_SECRET);
    algorithms = ['HS256'];
  } else {
    key = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', config.SUPABASE_URL));
    algorithms = ['ES256', 'RS256'];
  }
  return async (token) => {
    const { payload } = await jwtVerify(token, key as Uint8Array, {
      algorithms,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) {
      throw new Error('Token subject is not a user id');
    }
    return { id: payload.sub };
  };
}
