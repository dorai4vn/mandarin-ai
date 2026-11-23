import { ProviderError, type FetchLike, type ObjectStoragePort } from '../ports.js';

export interface SupabaseStorageConfig {
  url: string;
  /** Service role key — server only. */
  serviceRoleKey: string;
  bucket: string;
  fetch?: FetchLike;
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
      headers: {
        Authorization: `Bearer ${this.config.serviceRoleKey}`,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
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
