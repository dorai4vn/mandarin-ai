import {
  PulledSyncOperationSchema,
  type PulledSyncOperation,
  type SyncOperation,
} from '@mandarin/contracts';
import {
  ProviderError,
  type FetchLike,
  type SyncCaller,
  type SyncOperationStore,
  type SyncPushResult,
} from '../ports.js';

export interface SupabaseSyncConfig {
  url: string;
  /** Public publishable key (`sb_publishable_…`): identifies the project, grants nothing alone. */
  publishableKey: string;
  fetch?: FetchLike;
}

const PULL_COLUMNS =
  'operation_id,device_id,entity_type,op_type,schema_version,logical_clock,occurred_at,payload,server_seq';

interface PushRow {
  operation_id: string;
  status: 'applied' | 'duplicate' | 'rejected';
  server_seq: number | null;
}
interface PullRow {
  operation_id: string;
  device_id: string;
  entity_type: string;
  op_type: string;
  schema_version: number;
  logical_clock: number;
  occurred_at: string;
  payload: Record<string, unknown>;
  server_seq: number;
}

/**
 * Live sync store on Postgres `sync_operations` (M1, D-042) through PostgREST, authenticated with
 * the CALLER's own access token: owner-only RLS and the SECURITY INVOKER `sync_push()` run as that
 * user, so this adapter cannot read or write anyone else's rows even if it had a bug. No secret
 * key is used.
 */
export class SupabaseSyncStore implements SyncOperationStore {
  readonly mode = 'live' as const;
  private readonly fetchImpl: FetchLike;
  private readonly base: string;
  constructor(private readonly config: SupabaseSyncConfig) {
    this.fetchImpl = config.fetch ?? fetch;
    this.base = `${config.url.replace(/\/$/, '')}/rest/v1`;
  }

  private headers(caller: SyncCaller): Record<string, string> {
    return {
      apikey: this.config.publishableKey,
      Authorization: `Bearer ${caller.accessToken}`,
      Accept: 'application/json',
    };
  }

  private async send(url: string, init: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ProviderError('supabase-sync', 'unreachable', 'Sync database unreachable');
    }
    if (res.status === 401 || res.status === 403) {
      // Token rejected by the database (expired between the API check and this call).
      throw new ProviderError('supabase-sync', 'unauthorized', 'Token rejected', 401);
    }
    if (!res.ok)
      throw new ProviderError('supabase-sync', 'failed', `HTTP ${res.status}`, res.status);
    return res.json();
  }

  async push(caller: SyncCaller, ops: SyncOperation[]): Promise<SyncPushResult[]> {
    const rows = (await this.send(`${this.base}/rpc/sync_push`, {
      method: 'POST',
      headers: { ...this.headers(caller), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops }),
    })) as PushRow[];
    if (!Array.isArray(rows) || rows.length !== ops.length) {
      throw new ProviderError('supabase-sync', 'bad_response', 'Unexpected sync_push result');
    }
    return rows.map((r, i) => ({
      // Results come back in input order; keep the client's id even if the row echoes it.
      operationId: ops[i]!.operationId,
      status: r.status,
      serverVersion: r.server_seq ?? null,
      error: r.status === 'rejected' ? 'operation_id_conflict' : null,
    }));
  }

  async pull(caller: SyncCaller, after: number, limit: number) {
    const q = new URLSearchParams({
      select: PULL_COLUMNS,
      user_id: `eq.${caller.userId}`,
      server_seq: `gt.${after}`,
      order: 'server_seq.asc',
      limit: String(limit + 1),
    });
    const rows = (await this.send(`${this.base}/sync_operations?${q}`, {
      method: 'GET',
      headers: this.headers(caller),
    })) as PullRow[];
    if (!Array.isArray(rows)) {
      throw new ProviderError('supabase-sync', 'bad_response', 'Unexpected pull result');
    }
    const operations: PulledSyncOperation[] = rows.slice(0, limit).map((r) =>
      PulledSyncOperationSchema.parse({
        operationId: r.operation_id,
        deviceId: r.device_id,
        entityType: r.entity_type,
        opType: r.op_type,
        schemaVersion: r.schema_version,
        logicalClock: Number(r.logical_clock),
        occurredAt: r.occurred_at,
        payload: r.payload,
        serverSeq: Number(r.server_seq),
      }),
    );
    return { operations, hasMore: rows.length > limit };
  }
}
