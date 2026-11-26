import type { QuizAttemptPayload } from '@mandarin/contracts';
import type { QuizSessionState } from '@mandarin/domain';
import type { LocalStore } from '../offline/store';

export interface AttemptJob {
  attempt: QuizAttemptPayload;
  /** Session snapshot to persist once the attempt is durable. */
  session: QuizSessionState;
}

export type PersistResult =
  | { status: 'saved' }
  /** A write failed; the job stays queued (same attempt id) and `retry()` can resume it. */
  | { status: 'failed'; pending: number }
  /** Another tab already stored a DIFFERENT answer under this attempt id: that one is canonical. */
  | { status: 'conflict'; canonicalCorrect: boolean };

type Store = Pick<LocalStore, 'recordAttempt' | 'putSession' | 'listAttempts'>;

/**
 * Ordered, retry-safe persistence of quiz answers.
 *
 * - Jobs run strictly in order. A failure parks the job (and everything behind it) in `pending`
 *   instead of dropping it, so nothing is lost and no later write jumps ahead.
 * - `retry()` re-runs the parked jobs with the SAME attempt id; `recordAttempt` is idempotent by id
 *   (one attempt, one card fold, two outbox rows), so a retry after a partial failure never duplicates.
 * - After each write the stored attempt is read back. If it disagrees with what was shown (another
 *   tab / a resumed session answered the same slot first) the result is `conflict` and the session
 *   snapshot is NOT written, so the canonical record is never overwritten by a diverging view.
 */
export class AttemptPersistQueue {
  private jobs: AttemptJob[] = [];
  private tail: Promise<PersistResult> = Promise.resolve({ status: 'saved' });

  constructor(private readonly store: Store) {}

  get pending() {
    return this.jobs.length;
  }

  enqueue(job: AttemptJob): Promise<PersistResult> {
    this.jobs.push(job);
    return this.run();
  }

  /** Re-attempts parked jobs. Resolves when the queue is empty or failed again. */
  retry(): Promise<PersistResult> {
    return this.run();
  }

  /** Waits for in-flight work; reports `failed` while anything is still unsaved. */
  async flush(): Promise<PersistResult> {
    const last = await this.tail;
    if (last.status === 'conflict') return last;
    return this.jobs.length > 0 ? this.run() : { status: 'saved' };
  }

  private run(): Promise<PersistResult> {
    this.tail = this.tail.then(() => this.drain());
    return this.tail;
  }

  private async drain(): Promise<PersistResult> {
    while (this.jobs.length > 0) {
      const job = this.jobs[0]!;
      try {
        await this.store.recordAttempt(job.attempt);
        const stored = (await this.store.listAttempts(job.attempt.sessionId)).find(
          (a) => a.id === job.attempt.id,
        );
        if (stored && stored.correct !== job.attempt.correct) {
          // Drop this and any queued follow-ups of the same (now diverged) session view.
          this.jobs = [];
          return { status: 'conflict', canonicalCorrect: stored.correct };
        }
        await this.store.putSession(job.session);
        this.jobs.shift();
      } catch {
        return { status: 'failed', pending: this.jobs.length };
      }
    }
    return { status: 'saved' };
  }
}
