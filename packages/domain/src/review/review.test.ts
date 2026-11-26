import { performance } from 'node:perf_hooks';
import type { QuizAttemptPayload, SyncOperation } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { buildQueue, SESSION_LIMITS } from './queue.js';
import { buildQuestion, gradeChoice, preferredTypes, type Candidate } from './questions.js';
import {
  addDays,
  attemptFromOp,
  BOX_INTERVAL_DAYS,
  foldCard,
  type StoredAttempt,
} from './schedule.js';

const ITEM = 'vocab-0001-aaaa';
let n = 0;
const attempt = (
  correct: boolean,
  studyDate: string,
  over: Partial<QuizAttemptPayload> = {},
): StoredAttempt => {
  n += 1;
  const skill = over.skill ?? 'meaning';
  return {
    id: `att-session-${String(n).padStart(4, '0')}`,
    sessionId: 'session-0001',
    vocabularyItemId: ITEM,
    skill,
    quizType: 'meaning_recognition',
    quizTypeVersion: 1,
    correct,
    reason: correct ? 'match' : 'wrong_option',
    studyDate,
    responseMs: 1200,
    ...over,
    cardKey: `${over.vocabularyItemId ?? ITEM}|${skill}`,
    stamp: `2026-11-26T10:${String(n).padStart(2, '0')}:00.000Z|dev|${String(n).padStart(12, '0')}`,
  };
};

describe('review schedule (D-007)', () => {
  it('success climbs the ladder and waits the box interval', () => {
    const a = foldCard([attempt(true, '2026-11-26')])!;
    expect(a.box).toBe(1);
    expect(a.due).toBe('2026-11-27');
    const b = foldCard([attempt(true, '2026-11-26'), attempt(true, '2026-11-27')])!;
    expect(b.box).toBe(2);
    expect(b.due).toBe(addDays('2026-11-27', BOX_INTERVAL_DAYS[2]));
  });
  it('failure drops to box 0, due the same day, and counts a lapse', () => {
    const c = foldCard([
      attempt(true, '2026-11-26'),
      attempt(true, '2026-11-27'),
      attempt(false, '2026-11-29'),
    ])!;
    expect(c).toMatchObject({ box: 0, due: '2026-11-29', lapses: 1, lastCorrect: false });
  });
  it('a retry success after a same-day failure goes to box 1, not higher', () => {
    const c = foldCard([
      attempt(true, '2026-11-26'),
      attempt(true, '2026-11-27'),
      attempt(false, '2026-11-29'),
      attempt(true, '2026-11-29'),
    ])!;
    expect(c).toMatchObject({ box: 1, due: '2026-11-30' });
  });
  it('a repeated success on the same day does not climb twice', () => {
    const c = foldCard([attempt(true, '2026-11-26'), attempt(true, '2026-11-26')])!;
    expect(c.box).toBe(1);
  });
  it('the ladder stops at the top box', () => {
    const many = Array.from({ length: 12 }, (_, i) => attempt(true, addDays('2026-01-01', i * 70)));
    expect(foldCard(many)!.box).toBe(BOX_INTERVAL_DAYS.length - 1);
  });
  it('a failure in writing does not reset meaning (separate cards)', () => {
    const meaning = foldCard([attempt(true, '2026-11-26'), attempt(true, '2026-11-27')])!;
    const writing = foldCard([attempt(false, '2026-11-27', { skill: 'writing' })])!;
    expect(writing.key).toBe(`${ITEM}|writing`);
    expect(meaning.box).toBe(2);
    expect(meaning.key).toBe(`${ITEM}|meaning`);
  });
  it('is order- and replay-independent', () => {
    const list = [
      attempt(true, '2026-11-26'),
      attempt(true, '2026-11-27'),
      attempt(false, '2026-11-29'),
    ];
    const reference = foldCard(list);
    expect(foldCard([...list].reverse())).toEqual(reference);
    expect(foldCard([...list, ...list])).toEqual(reference);
  });
  it('reads attempts from operations and ignores invalid ones', () => {
    const base: SyncOperation = {
      operationId: 'op-0000000000000001',
      deviceId: 'device-aaaaaaaa',
      entityType: 'quiz_attempt',
      opType: 'create',
      schemaVersion: 1,
      logicalClock: 1,
      occurredAt: '2026-11-26T10:00:00Z',
      payload: {
        id: 'att-session-9999',
        sessionId: 'session-0001',
        vocabularyItemId: ITEM,
        skill: 'meaning',
        quizType: 'pinyin_matching',
        quizTypeVersion: 1,
        correct: true,
        reason: 'match',
        studyDate: '2026-11-26',
        responseMs: 10,
      },
    };
    expect(attemptFromOp(base)?.cardKey).toBe(`${ITEM}|meaning`);
    expect(attemptFromOp({ ...base, payload: { id: 'x' } })).toBeUndefined();
    expect(attemptFromOp({ ...base, entityType: 'other' })).toBeUndefined();
  });
});

const card = (id: string, due: string, box = 1, last = '2026-11-20') => ({
  key: `${id}|meaning`,
  vocabularyItemId: id,
  skill: 'meaning' as const,
  box,
  due,
  reps: 1,
  lapses: 0,
  lastStudyDate: last,
  lastCorrect: true,
});

describe('session queue', () => {
  const today = '2026-11-26';
  const due = [card('b', '2026-11-25'), card('a', '2026-11-20'), card('c', today)];
  const newIds = Array.from({ length: 15 }, (_, i) => `n${i}`);
  it('due: oldest due first', () => {
    expect(buildQueue({ mode: 'due', today, dueCards: due, newItemIds: newIds })).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
  it('new-day quiz: only new words, capped', () => {
    expect(buildQueue({ mode: 'new', today, dueCards: due, newItemIds: newIds })).toHaveLength(
      SESSION_LIMITS.new,
    );
  });
  it('mixed: due then new; no new words when the due list is full', () => {
    const q = buildQueue({ mode: 'mixed', today, dueCards: due, newItemIds: newIds });
    expect(q.slice(0, 3)).toEqual(['a', 'b', 'c']);
    expect(q).toHaveLength(3 + SESSION_LIMITS.new);
    const many = Array.from({ length: 25 }, (_, i) => card(`d${i}`, '2026-11-01'));
    const full = buildQueue({ mode: 'mixed', today, dueCards: many, newItemIds: newIds });
    expect(full).toHaveLength(SESSION_LIMITS.due);
  });
  it('multi-day recall: earlier-day words, weakest box first, even when not due', () => {
    const all = [
      card('x', '2026-12-30', 5, '2026-11-20'),
      card('y', '2026-11-27', 1, '2026-11-25'),
      card('z', '2026-12-01', 3, today), // studied today: excluded
    ];
    expect(
      buildQueue({ mode: 'recall', today, dueCards: [], allCards: all, newItemIds: [] }),
    ).toEqual(['y', 'x']);
  });
});

const pool: Candidate[] = Array.from({ length: 40 }, (_, i) => ({
  id: `w${i}`,
  simplified: `字${i}`,
  pinyin: `pīn${i}`,
  meaningVi: `nghĩa ${i}`,
}));

describe('questions', () => {
  it('builds each of the three types with the right prompt and a unique correct option', () => {
    const target = pool[3]!;
    const m = buildQuestion('meaning_recognition', target, pool, 's1')!;
    expect(m.prompt).toBe('字3');
    expect(m.options.map((o) => o.label)).toContain('nghĩa 3');
    const h = buildQuestion('hanzi_recognition', target, pool, 's1')!;
    expect(h.prompt).toBe('nghĩa 3');
    const p = buildQuestion('pinyin_matching', target, pool, 's1')!;
    expect(p.options.map((o) => o.label)).toContain('pīn3');
    for (const q of [m, h, p]) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.label)).size).toBe(4);
      expect(q.options.filter((o) => o.id === q.correctOptionId)).toHaveLength(1);
    }
  });
  it('is deterministic for a seed (resume rebuilds the same question)', () => {
    expect(buildQuestion('meaning_recognition', pool[5]!, pool, 'seed')).toEqual(
      buildQuestion('meaning_recognition', pool[5]!, pool, 'seed'),
    );
  });
  it('grades through the registry; wrong option is incorrect', () => {
    const q = buildQuestion('meaning_recognition', pool[0]!, pool, 's')!;
    expect(gradeChoice(q, q.correctOptionId)).toMatchObject({ correct: true, version: 1 });
    const wrong = q.options.find((o) => o.id !== q.correctOptionId)!;
    expect(gradeChoice(q, wrong.id)).toMatchObject({ correct: false, reason: 'wrong_option' });
  });
  it('needs at least one other distinct word; a single word yields no question', () => {
    expect(buildQuestion('meaning_recognition', pool[0]!, [pool[0]!], 's')).toBeNull();
    expect(
      buildQuestion('meaning_recognition', pool[0]!, pool.slice(0, 2), 's')!.options,
    ).toHaveLength(2);
  });
  it('works on a 12 000-word pool with bounded work', () => {
    const big = Array.from({ length: 12000 }, (_, i) => ({
      ...pool[0]!,
      id: `b${i}`,
      meaningVi: `m${i}`,
    }));
    const t = performance.now();
    for (let i = 0; i < 200; i++) buildQuestion('meaning_recognition', big[i]!, big, `s${i}`);
    expect(performance.now() - t).toBeLessThan(200);
  });
  it('rotates the starting type per seed over all three', () => {
    const starts = new Set(Array.from({ length: 30 }, (_, i) => preferredTypes(`k${i}`)[0]));
    expect(starts.size).toBe(3);
  });
});
