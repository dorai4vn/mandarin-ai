import { QUIZ_TYPE_IDS, type QuizTypeId } from '@mandarin/contracts';
import { type ReviewCard } from './schedule.js';

/**
 * Which words a study session contains.
 *  - `due`:    cards whose review day has come (oldest first) — the daily review;
 *  - `new`:    words never quizzed yet, newest first — the new-day quiz;
 *  - `recall`: words already studied on an earlier day, lowest box first, even if not due yet —
 *              multi-day recall;
 *  - `mixed`:  due first, then new words (the default "today" session).
 */
export type SessionMode = 'mixed' | 'due' | 'new' | 'recall';

export const SESSION_LIMITS = { due: 20, new: 10, recall: 10 } as const;

export interface QueueInput {
  mode: SessionMode;
  today: string;
  /** Due cards of the `meaning` skill (already filtered with the due index). */
  dueCards: ReviewCard[];
  /** Every meaning card — only needed for `recall`. */
  allCards?: ReviewCard[];
  /** Words (newest first) with no meaning card yet. */
  newItemIds: string[];
}

export function buildQueue(i: QueueInput): string[] {
  const due = [...i.dueCards]
    .sort((a, b) => a.due.localeCompare(b.due) || a.key.localeCompare(b.key))
    .map((c) => c.vocabularyItemId);
  if (i.mode === 'due') return due.slice(0, SESSION_LIMITS.due);
  if (i.mode === 'new') return i.newItemIds.slice(0, SESSION_LIMITS.new);
  if (i.mode === 'recall') {
    return (i.allCards ?? [])
      .filter((c) => c.lastStudyDate < i.today)
      .sort(
        (a, b) =>
          a.box - b.box ||
          a.lastStudyDate.localeCompare(b.lastStudyDate) ||
          a.key.localeCompare(b.key),
      )
      .slice(0, SESSION_LIMITS.recall)
      .map((c) => c.vocabularyItemId);
  }
  const head = due.slice(0, SESSION_LIMITS.due);
  const room = head.length >= SESSION_LIMITS.due ? 0 : SESSION_LIMITS.new;
  const taken = new Set(head);
  return [...head, ...i.newItemIds.filter((id) => !taken.has(id)).slice(0, room)];
}

export type MeaningQuizType = Extract<
  QuizTypeId,
  'meaning_recognition' | 'hanzi_recognition' | 'pinyin_matching'
>;
export const MEANING_QUIZ_TYPES: readonly MeaningQuizType[] = QUIZ_TYPE_IDS.filter(
  (t): t is MeaningQuizType =>
    t === 'meaning_recognition' || t === 'hanzi_recognition' || t === 'pinyin_matching',
);
