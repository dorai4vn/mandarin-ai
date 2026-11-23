import { z } from 'zod';

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  SUPABASE_URL: optional.pipe(z.url().optional()),
  SUPABASE_JWT_SECRET: optional,
  MISSING_PROVIDER_MODE: z.enum(['mock', 'disabled']).default('mock'),
  OPENAI_API_KEY: optional,
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime'),
  OPENAI_REALTIME_TTL_SECONDS: z.coerce.number().int().min(10).max(7200).default(600),
  AZURE_SPEECH_KEY: optional,
  AZURE_SPEECH_REGION: z
    .string()
    .regex(/^[a-z0-9]+$/)
    .default('southeastasia'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1000).default(20),
});

export type AppConfig = z.infer<typeof EnvSchema> & { version: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // Report variable names only, never values.
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid API configuration: ${fields}`);
  }
  const cfg = parsed.data;
  if (!cfg.SUPABASE_URL && !cfg.SUPABASE_JWT_SECRET) {
    throw new Error('Invalid API configuration: set SUPABASE_URL (JWKS) or SUPABASE_JWT_SECRET');
  }
  // Mocks are never allowed to stand in for providers in production.
  const mode = cfg.NODE_ENV === 'production' ? 'disabled' : cfg.MISSING_PROVIDER_MODE;
  return { ...cfg, MISSING_PROVIDER_MODE: mode, version: env.npm_package_version ?? '0.1.0' };
}
