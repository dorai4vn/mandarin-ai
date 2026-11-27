import { MOCK_LABEL, sha256Hex } from './mock-provider.js';
import { processImage } from './processing.js';
import { runQc } from './qc.js';
import {
  ProviderError,
  type ArtworkJob,
  type ArtworkProvenance,
  type ArtworkProvider,
  type ArtworkQueue,
  type ArtworkStorage,
} from './types.js';

export interface WorkerOptions {
  workerId?: string;
  concurrency?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  leaseMs?: number;
  /** Total cost units this worker may spend; jobs stay queued once exhausted. */
  budgetUnits?: number;
  now?: () => number;
}

export interface DrainReport {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  cancelled: number;
  budgetExhausted: boolean;
  spentUnits: number;
}

export function backoffMs(attempt: number, base: number, max: number): number {
  return Math.min(max, base * 2 ** Math.max(0, attempt - 1));
}

export class ArtworkWorker {
  private readonly o: Required<WorkerOptions>;
  private readonly aborts = new Map<string, AbortController>();
  private spent = 0;

  constructor(
    private readonly queue: ArtworkQueue,
    private readonly provider: ArtworkProvider,
    private readonly storage: ArtworkStorage,
    opts: WorkerOptions = {},
  ) {
    this.o = {
      workerId: opts.workerId ?? 'worker-1',
      concurrency: Math.max(1, opts.concurrency ?? 2),
      maxAttempts: opts.maxAttempts ?? 3,
      baseBackoffMs: opts.baseBackoffMs ?? 1000,
      maxBackoffMs: opts.maxBackoffMs ?? 30_000,
      leaseMs: opts.leaseMs ?? 60_000,
      budgetUnits: opts.budgetUnits ?? Number.POSITIVE_INFINITY,
      now: opts.now ?? Date.now,
    };
  }

  /** Cancels a queued or in-flight job. */
  cancel(jobId: string): boolean {
    this.aborts.get(jobId)?.abort();
    return this.queue.cancel(jobId);
  }

  /** Processes all currently due jobs, at most `concurrency` at once. */
  async drain(): Promise<DrainReport> {
    const r: DrainReport = {
      processed: 0,
      succeeded: 0,
      retried: 0,
      failed: 0,
      cancelled: 0,
      budgetExhausted: false,
      spentUnits: 0,
    };
    const inflight = new Set<Promise<void>>();
    for (;;) {
      while (inflight.size < this.o.concurrency && !r.budgetExhausted) {
        const job = this.queue.claim(this.o.workerId, this.o.leaseMs);
        if (!job) break;
        const cost = this.provider.estimateCost(job.request);
        if (this.spent + cost > this.o.budgetUnits) {
          // Hand the job back untouched (not an attempt).
          this.queue.fail(job.id, this.o.workerId, 'budget exhausted', this.o.now());
          job.attempts -= 1;
          r.budgetExhausted = true;
          break;
        }
        this.spent += cost;
        const p = this.run(job, r).finally(() => inflight.delete(p));
        inflight.add(p);
      }
      if (inflight.size === 0) break;
      await Promise.race(inflight);
    }
    r.spentUnits = this.spent;
    return r;
  }

  private async run(job: ArtworkJob, r: DrainReport): Promise<void> {
    const ac = new AbortController();
    this.aborts.set(job.id, ac);
    r.processed += 1;
    const w = this.o.workerId;
    try {
      const img = await this.provider.generate(job.request, { signal: ac.signal });
      const { bytes, metadata } = processImage(img);
      const provenance: ArtworkProvenance = {
        source: this.provider.kind === 'mock' ? 'mock' : 'ai_generated',
        providerId: this.provider.id,
        promptSha256: sha256Hex(job.request.prompt),
        seed: job.request.seed,
        createdAt: new Date(this.o.now()).toISOString(),
        placeholder: this.provider.kind === 'mock',
        isHistoricalEvidence: false,
        historicalEvidence: [],
      };
      const qc = runQc(bytes, metadata, provenance);
      if (!qc.passed) {
        this.queue.fail(job.id, w, `qc failed: ${qc.issues.map((i) => i.code).join(',')}`, null);
        r.failed += 1;
        return;
      }
      if (this.queue.get(job.id)?.status === 'cancelled' || ac.signal.aborted) {
        r.cancelled += 1;
        return;
      }
      const storageKey = `artwork/${metadata.sha256}.webp`;
      await this.storage.put(storageKey, bytes, 'image/webp', metadata.sha256);
      if (this.queue.succeed(job.id, w, { storageKey, metadata, provenance, qc })) r.succeeded += 1;
      else r.cancelled += 1;
    } catch (e) {
      if (this.queue.get(job.id)?.status === 'cancelled') {
        r.cancelled += 1;
        return;
      }
      const retryable = e instanceof ProviderError ? e.retryable : false;
      const msg = e instanceof Error ? e.message : String(e);
      if (retryable && job.attempts < this.o.maxAttempts) {
        const at =
          this.o.now() + backoffMs(job.attempts, this.o.baseBackoffMs, this.o.maxBackoffMs);
        this.queue.fail(job.id, w, msg, at);
        r.retried += 1;
      } else {
        this.queue.fail(job.id, w, msg, null);
        r.failed += 1;
      }
    } finally {
      this.aborts.delete(job.id);
    }
  }
}

export { MOCK_LABEL };
