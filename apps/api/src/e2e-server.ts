/**
 * TEST-ONLY entry for the Playwright E2E suite (no Supabase in CI's browser jobs).
 * Membership comes from an explicit in-memory fixture: every verified user is `active`.
 * Fail closed: refuses to start unless APP_ENV=development, NODE_ENV!=production and no real
 * Supabase credentials are configured. Production images run server.js, which keeps its gate.
 */
import { buildApp } from './app.js';
import { createTokenVerifier } from './auth.js';
import { loadConfig } from './config.js';
import type { MembershipStore } from './membership.js';
import { createProviders } from './providers.js';

const config = loadConfig();
if (
  config.appEnv !== 'development' ||
  config.NODE_ENV === 'production' ||
  config.SUPABASE_URL ||
  config.supabaseSecretKey
) {
  throw new Error('e2e-server is test-only: development without Supabase credentials');
}
const activeFixture: MembershipStore = async () => ({
  status: 'active',
  passwordChangeRequired: false,
  passwordChangedAt: null,
});
const app = buildApp({
  config,
  verifyToken: createTokenVerifier(config),
  providers: createProviders(config),
  membership: activeFixture,
});
await app.listen({ host: config.HOST, port: config.PORT });
