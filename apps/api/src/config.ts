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
  /** Comma-separated browser origins allowed by CORS (the web app). */
  WEB_ORIGINS: z.string().default('http://localhost:3000'),
  /** Path to HanziLookup `mmah.json` (fetched by script, D-029). */
  HANDWRITING_DATA_PATH: optional,
  /** Server-only key for Supabase Storage writes. */
  SUPABASE_SERVICE_ROLE_KEY: optional,
  STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9-]{3,63}$/)
    .default('documents'),
});

export type AppConfig = z.infer<typeof EnvSchema> & { version: string; webOrigins: string[] };

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
  const webOrigins = cfg.WEB_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  for (const o of webOrigins) {
    if (!/^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(o))
      throw new Error('Invalid API configuration: WEB_ORIGINS');
  }
  return {
    ...cfg,
    MISSING_PROVIDER_MODE: mode,
    webOrigins,
    version: env.npm_package_version ?? '0.1.0',
  };
}
