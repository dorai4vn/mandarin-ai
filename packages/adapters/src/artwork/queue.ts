import type { ArtworkJob, ArtworkQueue, ArtworkRequest, ArtworkResult } from './types.js';

/**
 * In-memory adapter for tests/local. Same contract the future Supabase adapter
 * must satisfy (see docs/ARTWORK_PIPELINE.md): atomic claim with lease
 * (FOR UPDATE SKIP LOCKED), unique idempotency_key, owner-checked completion.
 */
export class MemoryArtworkQueue implements ArtworkQueue {
  private readonly jobs = new Map<string, ArtworkJob>();
  private readonly byKey = new Map<string, string>();
  private seq = 0;
  constructor(private readonly now: () => number = Date.now) {}

  enqueue(idempotencyKey: string, request: ArtworkRequest): ArtworkJob {
    const existing = this.byKey.get(idempotencyKey);
    if (existing) return this.jobs.get(existing)!;
    const id = `job-${++this.seq}`;
    const job: ArtworkJob = {
      id,
      idempotencyKey,
      request,
      status: 'queued',
      attempts: 0,
      availableAt: this.now(),
      leaseOwner: null,
      leaseExpiresAt: null,
      lastError: null,
      result: null,
    };
    this.jobs.set(id, job);
    this.byKey.set(idempotencyKey, id);
    return job;
  }

  claim(workerId: string, leaseMs: number): ArtworkJob | null {
    const t = this.now();
    for (const job of this.jobs.values()) {
      const expired = job.status === 'running' && (job.leaseExpiresAt ?? 0) <= t;
      if ((job.status === 'queued' && job.availableAt <= t) || expired) {
        job.status = 'running';
        job.attempts += 1;
        job.leaseOwner = workerId;
        job.leaseExpiresAt = t + leaseMs;
        return job;
      }
    }
    return null;
  }

  private owned(id: string, workerId: string): ArtworkJob | null {
    const job = this.jobs.get(id);
    return job && job.status === 'running' && job.leaseOwner === workerId ? job : null;
  }

  succeed(id: string, workerId: string, result: ArtworkResult): boolean {
    const job = this.owned(id, workerId);
    if (!job) return false;
    job.status = 'succeeded';
    job.result = result;
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    return true;
  }

  fail(id: string, workerId: string, error: string, retryAt: number | null): boolean {
    const job = this.owned(id, workerId);
    if (!job) return false;
    job.lastError = error;
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    if (retryAt === null) job.status = 'failed';
    else {
      job.status = 'queued';
      job.availableAt = retryAt;
    }
    return true;
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status === 'succeeded' || job.status === 'cancelled') return false;
    job.status = 'cancelled';
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    return true;
  }

  requeue(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return false;
    job.status = 'queued';
    job.attempts = 0;
    job.availableAt = this.now();
    job.lastError = null;
    return true;
  }

  get(id: string): ArtworkJob | undefined {
    return this.jobs.get(id);
  }
  list(): readonly ArtworkJob[] {
    return [...this.jobs.values()];
  }
}
