import type { RealtimeSessionGrant } from '@mandarin/contracts';
import { ProviderError, type ConversationPort, type FetchLike } from '../ports.js';

export interface OpenAIRealtimeConfig {
  /** Server-side API key. Never shipped to the client. */
  apiKey: string;
  model: string;
  /** Lifetime of the minted client secret, seconds (10..7200). */
  ttlSeconds?: number;
  fetch?: FetchLike;
  baseUrl?: string;
}

/**
 * Mints a short-lived Realtime client secret (D-004 feasibility/auth spike).
 * Endpoint: POST /v1/realtime/client_secrets.
 */
export class OpenAIRealtimeSessions implements ConversationPort {
  private readonly fetchImpl: FetchLike;
  constructor(private readonly config: OpenAIRealtimeConfig) {
    this.fetchImpl = config.fetch ?? fetch;
  }

  async createSessionGrant({ userId }: { userId: string }): Promise<RealtimeSessionGrant> {
    const ttl = Math.min(Math.max(this.config.ttlSeconds ?? 600, 10), 7200);
    const res = await this.fetchImpl(
      `${this.config.baseUrl ?? 'https://api.openai.com'}/v1/realtime/client_secrets`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: { anchor: 'created_at', seconds: ttl },
          session: { type: 'realtime', model: this.config.model },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      throw new ProviderError('openai', 'http_error', `OpenAI returned ${res.status}`, res.status);
    }
    const body = (await res.json()) as { value?: unknown; expires_at?: unknown };
    if (typeof body.value !== 'string' || typeof body.expires_at !== 'number') {
      throw new ProviderError('openai', 'bad_response', 'Unexpected client secret response');
    }
    void userId; // reserved for per-user quota/audit in M6
    return {
      source: 'live',
      clientSecret: body.value,
      expiresAt: new Date(body.expires_at * 1000).toISOString(),
      model: this.config.model,
    };
  }
}
