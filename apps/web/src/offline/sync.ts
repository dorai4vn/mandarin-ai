import {
  SYNC_MAX_BATCH,
  type SyncOperation,
  type SyncPullResponse,
  type SyncPushResponse,
} from '@mandarin/contracts';
import { nextBatch, reconcile } from '@mandarin/domain';
import type { LocalStore } from './store';
import type { SyncAvailability } from './sync-availability';

export interface SyncSummary {
  applied: number;
  duplicate: number;
  rejected: number;
  retried: number;
  /** Operations received from the server (other devices of the same account). */
  pulled: number;
  source: 'live' | 'mock' | null;
  error: string | null;
}

/**
 * Whether a sync attempt may start. `navigator.onLine` can lag behind the `online` event (Firefox),
 * so a reconnect trigger overrides a stale `false`; any other trigger still requires it.
 */
export function canAttemptSync(navigatorOnLine: boolean, reconnected = false): boolean {
  return navigatorOnLine || reconnected;
}

export type PushFn = (ops: SyncOperation[]) => Promise<SyncPushResponse>;
export type PullFn = (after: number) => Promise<SyncPullResponse>;

/** Optional gate: never push while the server reports sync as not enabled (M0 Preview, D-035). */
export interface SyncGate {
  check(force?: boolean): Promise<SyncAvailability>;
  markUnavailable(): void;
  /** True when a push error means "sync is not enabled on this server" (503 provider_unavailable). */
  isUnavailableError(e: unknown): boolean;
}

interface LockManagerLike {
  request<T>(
    name: string,
    opts: { ifAvailable: boolean },
    cb: (lock: unknown) => Promise<T>,
  ): Promise<T>;
}

/**
 * Sends pending outbox operations in causal order. Safe to call any time and from several
 * tabs: a Web Lock (when available) serialises tabs, and the server dedupes by operationId.
 * No Background Sync is assumed (Safari/Firefox) — callers trigger it on open, `online`,
 * visibility change and after study sessions (D-021).
 */
export class SyncEngine {
  private running: Promise<SyncSummary> | null = null;
  private rerun: Promise<SyncSummary> | null = null;
  constructor(
    private readonly store: LocalStore,
    private readonly push: PushFn,
    private readonly locks: LockManagerLike | undefined = (
      globalThis.navigator as { locks?: LockManagerLike } | undefined
    )?.locks,
    /**
     * Whether an acknowledgement from a MOCK (in-memory) server may remove operations from the
     * outbox. Only true in development/E2E builds (NEXT_PUBLIC_ALLOW_MOCK_SYNC=true). Otherwise
     * a mock ack is treated as a failure so real study data is never dropped as "synced".
     */
    private readonly acceptMockAcks = false,
    private readonly gate?: SyncGate,
    /**
     * M1: `pull` brings the account's operations from other devices; `lockName` scopes the
     * cross-tab lock to one account so two accounts never share a sync run.
     */
    private readonly options: { pull?: PullFn; lockName?: string } = {},
  ) {}

  private forceCheck = false;

  /**
   * Starts a sync, or — if one is already running — schedules exactly one follow-up run so
   * operations queued during the current run are not left waiting for the next trigger.
   */
  syncNow(opts: { force?: boolean } = {}): Promise<SyncSummary> {
    if (opts.force) this.forceCheck = true;
    if (this.running) {
      this.rerun ??= this.running.then(() => {
        this.rerun = null;
        return this.syncNow();
      });
      return this.rerun;
    }
    const run = () => this.runOnce();
    this.running = (
      this.locks
        ? this.locks.request(
            this.options.lockName ?? 'mandarin-sync',
            { ifAvailable: true },
            (lock) => (lock ? run() : Promise.resolve(empty(null))),
          )
        : run()
    ).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runOnce(): Promise<SyncSummary> {
    const summary = empty(null);
    if (this.gate) {
      // Nothing queued and nothing to pull → nothing to ask the server (no request at all).
      if (!this.options.pull && nextBatch(await this.store.listOutbox(), 1).length === 0)
        return summary;
      const force = this.forceCheck;
      this.forceCheck = false;
      const availability = await this.gate.check(force);
      if (availability !== 'available') {
        // Outbox untouched: still pending, no attempt counted, nothing marked as synced.
        summary.error = availability === 'disabled' ? 'sync_unavailable' : 'sync_status_unknown';
        return summary;
      }
    }
    for (let round = 0; round < 50; round++) {
      const batch = nextBatch(await this.store.listOutbox(), SYNC_MAX_BATCH);
      if (batch.length === 0) break;
      let res: SyncPushResponse;
      try {
        res = await this.push(batch);
      } catch (e) {
        if (this.gate?.isUnavailableError(e)) {
          // Sync was switched off since the last check: remember it, keep the outbox as it is.
          this.gate.markUnavailable();
          summary.error = 'sync_unavailable';
          break;
        }
        // Response lost or network down: keep everything pending; the server dedupes on replay.
        await this.store.recordFailure(
          batch.map((o) => o.operationId),
          e instanceof Error ? e.message : String(e),
        );
        summary.error = e instanceof Error ? e.message : String(e);
        summary.retried += batch.length;
        break;
      }
      summary.source = res.source;
      if (res.source === 'mock' && !this.acceptMockAcks) {
        await this.store.recordFailure(
          batch.map((o) => o.operationId),
          'server_not_persistent',
        );
        summary.error = 'server_not_persistent';
        summary.retried += batch.length;
        break;
      }
      const rec = reconcile(batch, res.results);
      await this.store.applyReconciliation(rec);
      for (const r of res.results) {
        if (r.status === 'applied') summary.applied += 1;
        else if (r.status === 'duplicate') summary.duplicate += 1;
        else summary.rejected += 1;
      }
      summary.retried += rec.retry.length;
      if (rec.retry.length > 0) break;
    }
    if (this.options.pull && !summary.error) await this.pullAll(summary);
    return summary;
  }

  /** Pulls the account's operations after the stored cursor, page by page (bounded). */
  private async pullAll(summary: SyncSummary) {
    for (let page = 0; page < 20; page++) {
      let res: SyncPullResponse;
      try {
        res = await this.options.pull!(await this.store.pullCursor());
      } catch (e) {
        summary.error = e instanceof Error ? e.message : String(e);
        return;
      }
      summary.source ??= res.source;
      await this.store.applyPulled(res.operations, res.nextAfter);
      summary.pulled += res.operations.length;
      if (!res.hasMore) return;
    }
  }
}

const empty = (source: SyncSummary['source']): SyncSummary => ({
  applied: 0,
  duplicate: 0,
  rejected: 0,
  retried: 0,
  pulled: 0,
  source,
  error: null,
});
