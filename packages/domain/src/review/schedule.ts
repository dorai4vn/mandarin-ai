import type { QuizAttemptPayload, Skill, SyncOperation } from '@mandarin/contracts';
import { QuizAttemptPayloadSchema, QUIZ_ATTEMPT_ENTITY } from '@mandarin/contracts';
import { opStamp } from '../vocabulary/projection.js';

/**
 * Spaced repetition per (word, skill) — D-007. A Leitner ladder counted in the learner's calendar
 * days: a success moves one box up and waits that box's interval; a failure drops to box 0 and the
 * card is due again the same day. A failure in one skill never touches another skill's card.
 */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 7, 15, 30, 60] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;

export interface ReviewCard {
  /** `<vocabularyItemId>|<skill>` — unique per user (D-007). */
  key: string;
  vocabularyItemId: string;
  skill: Skill;
  box: number;
  /** Local day (YYYY-MM-DD) the card is next due. */
  due: string;
  reps: number;
  lapses: number;
  lastStudyDate: string;
  lastCorrect: boolean;
}

export const cardKey = (vocabularyItemId: string, skill: Skill) => `${vocabularyItemId}|${skill}`;

/** `date` (YYYY-MM-DD) + `days`, calendar arithmetic without time zones. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** An attempt as stored locally, with the total-order stamp of the operation that carried it. */
export interface StoredAttempt extends QuizAttemptPayload {
  cardKey: string;
  stamp: string;
}

/** Folds one attempt into a card. Pure. */
export function advanceCard(prev: ReviewCard | undefined, a: StoredAttempt): ReviewCard {
  if (prev && prev.lastStudyDate === a.studyDate && prev.lastCorrect && a.correct) {
    return prev; // already scheduled today: a repeat success must not climb the ladder twice
  }
  const box = a.correct ? Math.min((prev?.box ?? 0) + 1, MAX_BOX) : 0;
  return {
    key: a.cardKey,
    vocabularyItemId: a.vocabularyItemId,
    skill: a.skill,
    box,
    due: addDays(a.studyDate, BOX_INTERVAL_DAYS[box]!),
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (a.correct ? 0 : 1),
    lastStudyDate: a.studyDate,
    lastCorrect: a.correct,
  };
}

/**
 * The card is always the fold of its attempts in stamp order, so devices that receive the same
 * attempts in a different order — or the same attempt twice — end with the same schedule.
 */
export function foldCard(attempts: StoredAttempt[]): ReviewCard | undefined {
  const seen = new Set<string>();
  let card: ReviewCard | undefined;
  for (const a of [...attempts].sort((x, y) => x.stamp.localeCompare(y.stamp))) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    card = advanceCard(card, a);
  }
  return card;
}

/** The attempt carried by an operation, or undefined (unknown/invalid data is ignored). */
export function attemptFromOp(op: SyncOperation): StoredAttempt | undefined {
  if (op.entityType !== QUIZ_ATTEMPT_ENTITY || op.opType !== 'create') return undefined;
  const p = QuizAttemptPayloadSchema.safeParse(op.payload);
  if (!p.success) return undefined;
  return { ...p.data, cardKey: cardKey(p.data.vocabularyItemId, p.data.skill), stamp: opStamp(op) };
}

export const isDue = (card: ReviewCard, today: string) => card.due <= today;
