import 'fake-indexeddb/auto';
import { SESSION_LIMITS, type QuizSessionState } from '@mandarin/domain';
import { describe, expect, it } from 'vitest';
import { IndexedDbStore, MemoryStore, type LocalStore } from '@/offline/store';
import { buildSessionIds } from './queue-inputs';

const TODAY = '2026-11-26';
const vocabPayload = (id: string) => ({
  id,
  lexemeId: null,
  fields: {
    simplified: '字',
    traditional: null,
    pinyin: 'zì',
    meaningVi: 'chữ',
    example: null,
    notes: null,
    tags: [],
  },
  addition: { key: `k-${id}`, studyDate: TODAY, method: 'manual', lessonId: null, courseId: null },
});
const attempt = (n: number, item: string, studyDate: string) => ({
  id: `att-orph0001-${n}`,
  sessionId: 'orph0001',
  vocabularyItemId: item,
  skill: 'meaning' as const,
  quizType: 'meaning_recognition' as const,
  quizTypeVersion: 1,
  correct: true,
  reason: 'match' as const,
  studyDate,
  responseMs: 800,
});
const word = (n: number) => `word-${String(n).padStart(5, '0')}`;
const orphan = (n: number) => `orph-${String(n).padStart(5, '0')}`;

/** Counts every call made to the store, whatever the number of cards. */
function counted(store: LocalStore) {
  const calls: string[] = [];
  const proxy = new Proxy(store, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        calls.push(String(prop));
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return { proxy, calls };
}

/** `orphans` cards due long ago (no word) + `live` valid words due later; `deleted` words tombstoned. */
async function seed(store: LocalStore, orphans: number, live: number, deleted = 0) {
  for (let i = 0; i < orphans; i++) await store.recordAttempt(attempt(i, orphan(i), '2026-01-01'));
  for (let i = 0; i < live + deleted; i++) {
    await store.recordVocabulary('create', vocabPayload(word(i)));
    await store.recordAttempt(attempt(1000 + i, word(i), '2026-11-20'));
  }
  for (let i = live; i < live + deleted; i++)
    await store.recordVocabulary('delete', { id: word(i) });
}

describe.each([
  ['IndexedDB', () => IndexedDbStore.open(`orph-${Math.random()}`)],
  ['memory', async () => new MemoryStore()],
])('orphan cards on %s store', (_n, open) => {
  it('orphans that sort BEFORE valid cards cannot occupy the session limit; countDue agrees', async () => {
    const s = await open();
    const limit = SESSION_LIMITS.due * 2;
    await seed(s, limit + 5, 3, 2); // more orphans than the limit, all older than the valid cards
    const due = await s.dueCards(TODAY, 'meaning', limit);
    expect(due.map((c) => c.vocabularyItemId).sort()).toEqual([word(0), word(1), word(2)]);
    expect(await s.countDue(TODAY, 'meaning')).toBe(3); // same rule: orphans + tombstones not counted
    expect(await s.countDue(TODAY, 'meaning')).toBe(
      (await s.dueCards(TODAY, 'meaning', 1000)).length,
    );
    // Nothing is deleted automatically: the orphan cards are still stored.
    expect((await s.listCards()).length).toBe(limit + 5 + 5);
  });

  it('a session is built from valid cards only and never exceeds its limit', async () => {
    const s = await open();
    await seed(s, 100, SESSION_LIMITS.due + 15);
    const live = new Set((await s.listVocabulary()).map((v) => v.id));
    const ids = await buildSessionIds(s, 'due', TODAY, 'meaning', live, []);
    expect(ids).toHaveLength(SESSION_LIMITS.due);
    expect(ids.every((id) => live.has(id))).toBe(true);
    const mixed = await buildSessionIds(s, 'mixed', TODAY, 'meaning', live, ['new-0000001']);
    expect(mixed.length).toBeLessThanOrEqual(SESSION_LIMITS.due + SESSION_LIMITS.new);
    expect(mixed.every((id) => live.has(id) || id === 'new-0000001')).toBe(true);
  });

  it('store call count is constant: it does not grow with the number of cards', async () => {
    const small = await open();
    const big = await open();
    await seed(small, 5, 5);
    await seed(big, 300, 300);
    const run = async (s: LocalStore, mode: QuizSessionState['mode']) => {
      const { proxy, calls } = counted(s);
      const live = new Set((await s.listVocabulary()).map((v) => v.id));
      calls.length = 0;
      await buildSessionIds(proxy, mode, TODAY, 'meaning', live, []);
      return calls;
    };
    for (const mode of ['due', 'mixed', 'new', 'recall'] as const) {
      const a = await run(small, mode);
      const b = await run(big, mode);
      expect(b).toEqual(a);
      expect(b.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('P4 dataset D-L at the store (12 000 cards)', () => {
  it('12 000 cards, orphans first: valid cards still selected, count consistent', async () => {
    const s = await IndexedDbStore.open(`dl-${Math.random()}`);
    // Seed through the public API is too slow for 12k: write cards directly with the same shape.
    const db = (s as unknown as { db: { cards: { bulkPut(c: unknown[]): Promise<unknown> } } }).db;
    const cards = [];
    for (let w = 0; w < 3000; w++)
      for (const skill of ['meaning', 'reading', 'listening', 'writing'])
        cards.push({
          key: `${orphan(w)}|${skill}`,
          vocabularyItemId: orphan(w),
          skill,
          box: 1,
          due: '2026-01-01',
          reps: 1,
          lapses: 0,
          lastStudyDate: '2025-12-31',
          lastCorrect: true,
        });
    await db.cards.bulkPut(cards);
    for (let i = 0; i < 7; i++) {
      await s.recordVocabulary('create', vocabPayload(word(i)));
      await s.recordAttempt(attempt(i, word(i), '2026-11-20'));
    }
    expect((await s.listCards()).length).toBe(12_007);
    // Correctness only: fake-indexeddb is orders of magnitude slower than a browser, so timing is
    // asserted where it is meaningful — e2e/perf-quiz.spec.ts (real Chromium, CPU 4x, D-L).
    const due = await s.dueCards(TODAY, 'meaning', SESSION_LIMITS.due * 2);
    expect(due).toHaveLength(7);
    expect(await s.countDue(TODAY, 'meaning')).toBe(7);
    const ids = await buildSessionIds(
      s,
      'due',
      TODAY,
      'meaning',
      new Set((await s.listVocabulary()).map((v) => v.id)),
      [],
    );
    expect(ids).toHaveLength(7);
  }, 60_000);
});
