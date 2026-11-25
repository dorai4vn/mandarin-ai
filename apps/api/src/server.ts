import { buildApp } from './app.js';
import { createTokenVerifier } from './auth.js';
import { loadConfig } from './config.js';
import { cachedMembership, supabaseMembership } from './membership.js';
import { createProviders } from './providers.js';

const config = loadConfig();
if (!config.SUPABASE_URL || !config.supabaseSecretKey) {
  // Fail closed: without a membership source nobody may use /v1.
  throw new Error('Invalid API configuration: SUPABASE_URL and SUPABASE_SECRET_KEY are required');
}
const app = buildApp({
  config,
  verifyToken: createTokenVerifier(config),
  providers: createProviders(config),
  membership: cachedMembership(
    supabaseMembership({ url: config.SUPABASE_URL, secretKey: config.supabaseSecretKey }),
  ),
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: config.HOST, port: config.PORT });
