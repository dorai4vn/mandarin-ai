import { z } from 'zod';
import { QuizTypeIdSchema } from './quiz-types.js';
import { SkillSchema } from './skills.js';

/**
 * Quiz attempts and learning events (M3, D-003, D-007, D-043). Like personal vocabulary they are
 * the account's own sync operations: a `quiz_attempt` create per answer and a `learning_event`
 * per event, both with a deterministic payload `id`, so replaying an operation never duplicates
 * an attempt, an event or a review schedule. The review schedule per (word, skill) is a
 * projection of the attempts. No XP is computed here (D-003).
 */
export const QUIZ_ATTEMPT_ENTITY = 'quiz_attempt';
export const LEARNING_EVENT_ENTITY = 'learning_event';

export const QuizAttemptPayloadSchema = z.object({
  /** Deterministic: `att-<sessionId>-<n>`. The same answer replayed is the same attempt. */
  id: z.string().min(8).max(100),
  sessionId: z.string().min(8).max(80),
  vocabularyItemId: z.string().min(8).max(64),
  skill: SkillSchema,
  quizType: QuizTypeIdSchema,
  quizTypeVersion: z.number().int().positive(),
  correct: z.boolean(),
  reason: z.string().max(40),
  /** Learner's local calendar day; the schedule is counted in these days. */
  studyDate: z.iso.date(),
  responseMs: z.number().int().min(0).max(3_600_000),
});
export type QuizAttemptPayload = z.infer<typeof QuizAttemptPayloadSchema>;

export const LearningEventPayloadSchema = z.object({
  /** Deterministic (`<attemptId>:answered`, `<sessionId>:started`…): events dedupe by id. */
  id: z.string().min(8).max(120),
  eventType: z.string().regex(/^[a-z]+(\.[a-z_]+)+$/),
  eventVersion: z.number().int().positive(),
  sessionId: z.string().min(8).max(80),
  data: z.record(z.string(), z.unknown()),
});
export type LearningEventPayload = z.infer<typeof LearningEventPayloadSchema>;
