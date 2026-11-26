import 'fake-indexeddb/auto';
import type { QuizAttemptPayload } from '@mandarin/contracts';
import type { QuizSessionState } from '@mandarin/domain';
import { describe, expect, it } from 'vitest';
import { IndexedDbStore, MemoryStore, type LocalStore } from '../offline/store';
import { AttemptPersistQueue, type AttemptJob } from './persist-queue';

const attempt = (n: number, correct: boolean): QuizAttemptPayload => ({
  id: `att-sess0001-${n}`,
  sessionId: 'sess0001',
  vocabularyItemId: 'vocab-0001-aaaa',
  skill: 'meaning',
  quizType: 'meaning_recognition',
  quizTypeVersion: 1,
  correct,
  reason: correct ? 'match' : 'wrong_option',
  studyDate: '2026-11-26',
  responseMs: 800,
});
const session = (answered: number): QuizSessionState => ({
  id: 'sess0001',
  mode: 'mixed',
  studyDate: '2026-11-26',
  startedAt: '2026-11-26T10:00:00.000Z',
  queue: [{ itemId: 'vocab-0001-aaaa', quizType: 'meaning_recognition' }],
  answers: Array.from({ length: answered }, (_, i) => ({
    itemId: 'vocab-0001-aaaa',
    correct: true,
    attemptId: `att-sess0001-${i}`,
  })),
  completed: false,
});
const job = (n: number, correct = true): AttemptJob => ({
  attempt: attempt(n, correct),
  session: session(n + 1),
});

/** Fails the next `failures` calls of `method`, after delegating nothing (write never happened). */
function flaky(store: LocalStore, method: 'recordAttempt' | 'putSession', failures: number) {
  let left = failures;
  const real = store[method].bind(store) as (...a: unknown[]) => Promise<unknown>;
  (store as unknown as Record<string, unknown>)[method] = async (...a: unknown[]) => {
    if (left-- > 0) throw new Error('injected');
    return real(...a);
  };
}

describe.each([
  ['IndexedDB', () => IndexedDbStore.open(`pq-${Math.random()}`)],
  ['memory', async () => new MemoryStore()],
])('AttemptPersistQueue on %s store', (_n, open) => {
  it('I2: a failed write is parked, not lost; retry with the same id writes exactly once', async () => {
    const s = await open();
    flaky(s, 'recordAttempt', 1);
    const q = new AttemptPersistQueue(s);
    expect(await q.enqueue(job(0))).toEqual({ status: 'failed', pending: 1 });
    expect(await s.listAttempts('sess0001')).toHaveLength(0);
    // Completion must not be reportable while the answer is not durable.
    expect((await q.flush()).status).toBe('saved'); // flush retried and succeeded…
    expect(await s.listAttempts('sess0001')).toHaveLength(1);
    expect(await s.listOutbox()).toHaveLength(2); // attempt + event, no duplicates
    expect((await s.getSession())!.answers).toHaveLength(1);
    expect((await q.retry()).status).toBe('saved'); // extra retry is a no-op
    expect(await s.listOutbox()).toHaveLength(2);
    expect(await s.countEvents()).toBe(1);
  });

  it('I2: flush keeps reporting failure while the store keeps failing; later answers queue behind', async () => {
    const s = await open();
    flaky(s, 'recordAttempt', 3);
    const q = new AttemptPersistQueue(s);
    expect((await q.enqueue(job(0))).status).toBe('failed');
    expect((await q.enqueue(job(1))).status).toBe('failed'); // 2nd injected failure, order kept
    expect(q.pending).toBe(2);
    expect((await q.flush()).status).toBe('failed'); // 3rd injected failure: never "saved"
    expect(await s.listAttempts('sess0001')).toHaveLength(0);
    expect((await q.retry()).status).toBe('saved');
    expect(await s.listAttempts('sess0001')).toHaveLength(2);
    expect(await s.listOutbox()).toHaveLength(4);
    expect((await s.getSession())!.answers).toHaveLength(2);
  });

  it('I2: session snapshot failure after the attempt is durable retries without a second attempt', async () => {
    const s = await open();
    flaky(s, 'putSession', 1);
    const q = new AttemptPersistQueue(s);
    expect((await q.enqueue(job(0))).status).toBe('failed');
    expect(await s.listAttempts('sess0001')).toHaveLength(1);
    expect((await q.retry()).status).toBe('saved');
    expect(await s.listAttempts('sess0001')).toHaveLength(1);
    expect((await s.listCards())[0]!.reps).toBe(1);
    expect(await s.listOutbox()).toHaveLength(2);
  });

  it('I1: rapid duplicate submissions of the same attempt id store one attempt', async () => {
    const s = await open();
    const q = new AttemptPersistQueue(s);
    const results = await Promise.all([q.enqueue(job(0)), q.enqueue(job(0)), q.enqueue(job(0))]);
    expect(results.every((r) => r.status === 'saved')).toBe(true);
    expect(await s.listAttempts('sess0001')).toHaveLength(1);
    expect(await s.listOutbox()).toHaveLength(2);
    expect((await s.listCards())[0]!.reps).toBe(1);
  });

  it('I1: the same attempt id answered differently reports a conflict and keeps the canonical record', async () => {
    const s = await open();
    await new AttemptPersistQueue(s).enqueue(job(0, true)); // "tab A" got there first
    const lateTab = new AttemptPersistQueue(s);
    const r = await lateTab.enqueue(job(0, false)); // "tab B" showed a different outcome
    expect(r).toEqual({ status: 'conflict', canonicalCorrect: true });
    const stored = await s.listAttempts('sess0001');
    expect(stored).toHaveLength(1);
    expect(stored[0]!.correct).toBe(true);
    expect((await s.listCards())[0]).toMatchObject({ box: 1, lapses: 0 });
    expect(await s.listOutbox()).toHaveLength(2);
    expect(lateTab.pending).toBe(0);
  });
});

describe('I1 cross-tab on one IndexedDB database', () => {
  it('two connections racing on the same attempt id: one canonical attempt, loser gets a conflict', async () => {
    const name = `pq-shared-${Math.random()}`;
    const a = await IndexedDbStore.open(name);
    const b = await IndexedDbStore.open(name);
    const [ra, rb] = await Promise.all([
      new AttemptPersistQueue(a).enqueue(job(0, true)),
      new AttemptPersistQueue(b).enqueue(job(0, false)),
    ]);
    const stored = await a.listAttempts('sess0001');
    expect(stored).toHaveLength(1);
    const statuses = [ra.status, rb.status].sort();
    // Exactly one writer wins; the other sees the canonical record (conflict) — never two attempts.
    expect(statuses).toEqual(['conflict', 'saved']);
    expect(await a.listOutbox()).toHaveLength(2);
    expect((await a.listCards())[0]!.reps).toBe(1);
  });
});
