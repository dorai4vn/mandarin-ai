import { z } from 'zod';
import type { Skill } from './skills.js';

/** The six initial quiz types (D-002). Order is stable; append only. */
export const QUIZ_TYPE_IDS = [
  'meaning_recognition',
  'hanzi_recognition',
  'pinyin_matching',
  'audio_recognition',
  'dictation',
  'handwriting',
] as const;

export const QuizTypeIdSchema = z.enum(QUIZ_TYPE_IDS);
export type QuizTypeId = z.infer<typeof QuizTypeIdSchema>;

/** Which skill schedule each built-in quiz type trains (D-007). */
export const QUIZ_TYPE_SKILL: Readonly<Record<QuizTypeId, Skill>> = Object.freeze({
  meaning_recognition: 'meaning',
  hanzi_recognition: 'meaning',
  pinyin_matching: 'meaning',
  audio_recognition: 'listening',
  dictation: 'listening',
  handwriting: 'writing',
});

/** Answer payload for multiple-choice quiz types. */
export const ChoiceAnswerSchema = z.object({ optionId: z.string().min(1) });
export type ChoiceAnswer = z.infer<typeof ChoiceAnswerSchema>;

/** Answer payload for typed dictation (Hanzi text). */
export const TextAnswerSchema = z.object({ text: z.string() });
export type TextAnswer = z.infer<typeof TextAnswerSchema>;
