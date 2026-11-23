import { SYNC_MAX_BATCH, type SyncOperation, type SyncPushResponse } from '@mandarin/contracts';
import { nextBatch, reconcile } from '@mandarin/domain';
import type { LocalStore } from './store';

export interface SyncSummary {
  applied: number;
  duplicate: number;
  rejected: number;
  retried: number;
  source: 'live' | 'mock' | null;
  error: string | null;
}

export type PushFn = (ops: SyncOperation[]) => Promise<SyncPushResponse>;

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
  ) {}

  /**
   * Starts a sync, or — if one is already running — schedules exactly one follow-up run so
   * operations queued during the current run are not left waiting for the next trigger.
   */
  syncNow(): Promise<SyncSummary> {
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
        ? this.locks.request('mandarin-sync', { ifAvailable: true }, (lock) =>
            lock ? run() : Promise.resolve(empty(null)),
          )
        : run()
    ).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runOnce(): Promise<SyncSummary> {
    const summary = empty(null);
    for (let round = 0; round < 50; round++) {
      const batch = nextBatch(await this.store.listOutbox(), SYNC_MAX_BATCH);
      if (batch.length === 0) break;
      let res: SyncPushResponse;
      try {
        res = await this.push(batch);
      } catch (e) {
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
    return summary;
  }
}

const empty = (source: SyncSummary['source']): SyncSummary => ({
  applied: 0,
  duplicate: 0,
  rejected: 0,
  retried: 0,
  source,
  error: null,
});
