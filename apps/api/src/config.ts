import { z } from 'zod';

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * Deployment stage. Defaults to `production` when NODE_ENV=production (e.g. any container),
   * so mocks can never leak into production by omission. Preview must be set explicitly.
   */
  APP_ENV: z.enum(['development', 'preview', 'production']).optional(),
  /** Preview only: allow clearly labelled MOCK providers (still behind auth). */
  ALLOW_MOCKS_IN_PREVIEW: z.enum(['true', 'false']).default('false'),
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
  /**
   * Handwriting adapter (D-029). `hanzilookup` is NOT approved for production or public preview
   * (licence review pending): refused unless APP_ENV=development; default is `disabled`.
   */
  HANDWRITING_ADAPTER: z.enum(['disabled', 'mock', 'hanzilookup']).default('disabled'),
  /** Path to HanziLookup `mmah.json` (fetched by script, D-029). */
  HANDWRITING_DATA_PATH: optional,
  /** Optional anchored regex for preview origins, e.g. ^https://mandarin-ai-[a-z0-9-]+-team\.vercel\.app$ */
  WEB_ORIGIN_REGEX: optional,
  /** Per-IP limit for every request (abuse guard in front of auth). */
  IP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).max(10000).default(300),
  /** Behind a reverse proxy (Railway, Vercel) set true so the client IP comes from X-Forwarded-For. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  /** Server-only key for Supabase Storage writes. */
  SUPABASE_SERVICE_ROLE_KEY: optional,
  STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9-]{3,63}$/)
    .default('documents'),
});

export type AppEnv = 'development' | 'preview' | 'production';

export type AppConfig = z.infer<typeof EnvSchema> & {
  version: string;
  appEnv: AppEnv;
  webOrigins: string[];
  webOriginRegex: RegExp | null;
};

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
  const appEnv: AppEnv =
    cfg.APP_ENV ?? (cfg.NODE_ENV === 'production' ? 'production' : 'development');
  // Mocks never stand in for providers in production; in preview only when explicitly allowed.
  const mocksAllowed =
    appEnv === 'development' || (appEnv === 'preview' && cfg.ALLOW_MOCKS_IN_PREVIEW === 'true');
  const mode = mocksAllowed ? cfg.MISSING_PROVIDER_MODE : 'disabled';
  if (appEnv !== 'development' && cfg.HANDWRITING_ADAPTER === 'hanzilookup') {
    // D-029: not approved for production OR public preview (licence review pending).
    throw new Error(
      'Invalid API configuration: HANDWRITING_ADAPTER=hanzilookup is only allowed in development (D-029)',
    );
  }
  if (cfg.HANDWRITING_ADAPTER === 'mock' && !mocksAllowed) {
    throw new Error(
      'Invalid API configuration: HANDWRITING_ADAPTER=mock requires mocks to be allowed',
    );
  }
  let webOriginRegex: RegExp | null = null;
  if (cfg.WEB_ORIGIN_REGEX) {
    if (!cfg.WEB_ORIGIN_REGEX.startsWith('^https://') || !cfg.WEB_ORIGIN_REGEX.endsWith('$')) {
      throw new Error('Invalid API configuration: WEB_ORIGIN_REGEX must be anchored ^https://…$');
    }
    webOriginRegex = new RegExp(cfg.WEB_ORIGIN_REGEX);
  }
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
    appEnv,
    webOrigins,
    webOriginRegex,
    version: env.npm_package_version ?? '0.1.0',
  };
}
