import { ProviderError, type FetchLike, type ObjectStoragePort } from '../ports.js';

export interface SupabaseStorageConfig {
  url: string;
  /**
   * Server-only key: the new secret API key (`sb_secret_…`) or a legacy `service_role` JWT.
   * New-style keys are not JWTs and must be sent in the `apikey` header only.
   */
  secretKey: string;
  bucket: string;
  fetch?: FetchLike;
}

/** Headers for Supabase Storage with a privileged key (new `sb_secret_…` or legacy JWT). */
export function storageAuthHeaders(secretKey: string, contentType: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: secretKey,
    'Content-Type': contentType,
    'x-upsert': 'false',
  };
  // Legacy service_role keys are JWTs and are also sent as Bearer; sb_secret_ keys must not be.
  if (secretKey.startsWith('eyJ')) headers.Authorization = `Bearer ${secretKey}`;
  return headers;
}

const SAFE_PATH = /^[a-zA-Z0-9/_.-]{1,512}$/;

/** Writes private objects through the Supabase Storage REST API (bucket must be private). */
export class SupabaseObjectStorage implements ObjectStoragePort {
  readonly mode = 'live' as const;
  private readonly fetchImpl: FetchLike;
  constructor(private readonly config: SupabaseStorageConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  async put(path: string, body: Uint8Array, contentType: string): Promise<void> {
    if (!SAFE_PATH.test(path) || path.includes('..'))
      throw new ProviderError('supabase-storage', 'bad_path', 'Invalid path');
    const url = `${this.config.url.replace(/\/$/, '')}/storage/v1/object/${this.config.bucket}/${path}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: storageAuthHeaders(this.config.secretKey, contentType),
      body: body as unknown as BodyInit,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok)
      throw new ProviderError(
        'supabase-storage',
        'http_error',
        `Storage returned ${res.status}`,
        res.status,
      );
  }
}
