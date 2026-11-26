import 'fake-indexeddb/auto';
import type { PulledSyncOperation, QuizAttemptPayload, SyncOperation } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { IndexedDbStore, MemoryStore, type LocalStore } from './store';

const attempt = (n: number, correct: boolean, studyDate: string, item = 'vocab-0001-aaaa') =>
  ({
    id: `att-sess0001-${n}`,
    sessionId: 'sess0001',
    vocabularyItemId: item,
    skill: 'meaning',
    quizType: 'meaning_recognition',
    quizTypeVersion: 1,
    correct,
    reason: correct ? 'match' : 'wrong_option',
    studyDate,
    responseMs: 900,
  }) satisfies QuizAttemptPayload;

const asPulled = (ops: SyncOperation[]): PulledSyncOperation[] =>
  ops.map((op, i) => ({ ...op, serverSeq: i + 1 }));

async function quizOps(store: LocalStore) {
  return (await store.listOutbox()).map((e) => e.op);
}

describe.each([
  ['IndexedDB', () => IndexedDbStore.open(`quiz-${Math.random()}`)],
  ['memory', async () => new MemoryStore()],
])('quiz attempts on %s store', (_name, open) => {
  it('records attempt + event + card + 2 outbox rows once; a replay changes nothing', async () => {
    const s = await open();
    const card = await s.recordAttempt(attempt(1, true, '2026-11-26'));
    expect(card).toMatchObject({ box: 1, due: '2026-11-27' });
    const before = await s.listOutbox();
    expect(before.map((e) => e.op.entityType)).toEqual(['quiz_attempt', 'learning_event']);
    expect(await s.countEvents()).toBe(1);
    await s.recordAttempt(attempt(1, true, '2026-11-26')); // double tap / replay
    expect(await s.listOutbox()).toHaveLength(2);
    expect(await s.countEvents()).toBe(1);
    expect((await s.listCards())[0]!.reps).toBe(1);
  });

  it('a second device converges on the same schedule from pulled operations, in any order, twice', async () => {
    const a = await open();
    await a.recordAttempt(attempt(1, true, '2026-11-26'));
    await a.recordAttempt(attempt(2, true, '2026-11-27'));
    await a.recordAttempt(attempt(3, false, '2026-11-29'));
    const ops = await quizOps(a);
    const b = await open();
    await b.applyPulled(asPulled([...ops].reverse()), 6);
    await b.applyPulled(asPulled(ops), 6); // redelivery
    expect(await b.listCards()).toEqual(await a.listCards());
    expect(await b.countEvents()).toBe(3);
    expect(await b.listOutbox()).toHaveLength(0); // pulled operations are never re-sent
  });

  it('keeps the meaning and writing schedules apart', async () => {
    const s = await open();
    await s.recordAttempt(attempt(1, true, '2026-11-26'));
    await s.recordAttempt({
      ...attempt(2, false, '2026-11-26'),
      skill: 'writing',
      quizType: 'handwriting',
    });
    const cards = Object.fromEntries((await s.listCards()).map((c) => [c.skill, c]));
    expect(cards.meaning!.box).toBe(1);
    expect(cards.writing!.box).toBe(0);
  });

  it('due query: only cards due on/before the day, oldest first, limited', async () => {
    const s = await open();
    // Only cards of words that exist in this account's vocabulary are due (orphans are ignored).
    for (const id of ['vocab-0000-aaaa', 'vocab-0001-aaaa', 'vocab-0002-aaaa'])
      await s.recordVocabulary('create', {
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
        addition: {
          key: `k-${id}`,
          studyDate: '2026-11-20',
          method: 'manual',
          lessonId: null,
          courseId: null,
        },
      });
    await s.recordAttempt(attempt(1, true, '2026-11-20', 'vocab-0000-aaaa')); // due 11-21
    await s.recordAttempt(attempt(2, true, '2026-11-25', 'vocab-0001-aaaa')); // due 11-26
    await s.recordAttempt(attempt(3, true, '2026-11-26', 'vocab-0002-aaaa')); // due 11-27
    const due = await s.dueCards('2026-11-26', 'meaning', 10);
    expect(due.map((c) => c.vocabularyItemId)).toEqual(['vocab-0000-aaaa', 'vocab-0001-aaaa']);
    expect(await s.countDue('2026-11-26', 'meaning')).toBe(2);
    expect((await s.dueCards('2026-11-26', 'meaning', 1)).length).toBe(1);
    expect((await s.cardedItemIds('meaning')).size).toBe(3);
  });

  it('keeps an in-progress session and clears it on demand; learning events are idempotent', async () => {
    const s = await open();
    const session = {
      id: 'sess0001',
      mode: 'mixed' as const,
      studyDate: '2026-11-26',
      startedAt: '2026-11-26T10:00:00.000Z',
      queue: [{ itemId: 'vocab-0001-aaaa', quizType: 'meaning_recognition' as const }],
      answers: [],
      completed: false,
    };
    await s.putSession(session);
    expect(await s.getSession()).toEqual(session);
    const ev = {
      id: 'sess0001:started',
      eventType: 'quiz.session_started',
      eventVersion: 1,
      sessionId: 'sess0001',
      data: {},
    };
    expect(await s.recordLearningEvent(ev)).toBe(true);
    expect(await s.recordLearningEvent(ev)).toBe(false);
    await s.clearSession();
    expect(await s.getSession()).toBeNull();
  });
});

describe('IndexedDB isolation', () => {
  it('another account database holds none of the quiz data; sign-out deletes it', async () => {
    const a = await IndexedDbStore.open('mandarin-ai:user-a');
    await a.recordAttempt(attempt(1, true, '2026-11-26'));
    const b = await IndexedDbStore.open('mandarin-ai:user-b');
    expect(await b.listCards()).toHaveLength(0);
    expect(await b.countEvents()).toBe(0);
    await a.destroy();
    const again = await IndexedDbStore.open('mandarin-ai:user-a');
    expect(await again.listCards()).toHaveLength(0);
  });
});
