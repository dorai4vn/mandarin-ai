import {
  ChoiceAnswerSchema,
  QUIZ_TYPE_SKILL,
  TextAnswerSchema,
  type ChoiceAnswer,
  type InkCandidate,
  type QuizTypeId,
  type TextAnswer,
} from '@mandarin/contracts';
import { z } from 'zod';
import { QuizTypeRegistry, type GradeResult, type QuizTypeDefinition } from './registry.js';

export interface ChoicePrompt {
  correctOptionId: string;
}

function choiceType(id: QuizTypeId): QuizTypeDefinition<ChoicePrompt, ChoiceAnswer> {
  return {
    id,
    version: 1,
    skill: QUIZ_TYPE_SKILL[id],
    parseAnswer: (input) => ChoiceAnswerSchema.parse(input),
    grade: (prompt, answer): GradeResult =>
      answer.optionId === prompt.correctOptionId
        ? { correct: true, reason: 'match' }
        : { correct: false, reason: 'wrong_option' },
  };
}

/** Removes whitespace and common punctuation so 「山。」 and 山 compare equal. */
export function normalizeHanziAnswer(text: string): string {
  return text.normalize('NFC').replace(/[\s\p{P}]/gu, '');
}

export interface DictationPrompt {
  expectedHanzi: string;
}

export const dictationType: QuizTypeDefinition<DictationPrompt, TextAnswer> = {
  id: 'dictation',
  version: 1,
  skill: QUIZ_TYPE_SKILL.dictation,
  parseAnswer: (input) => TextAnswerSchema.parse(input),
  grade: (prompt, answer) => {
    const given = normalizeHanziAnswer(answer.text);
    if (given.length === 0) return { correct: false, reason: 'empty' };
    return given === normalizeHanziAnswer(prompt.expectedHanzi)
      ? { correct: true, reason: 'match' }
      : { correct: false, reason: 'mismatch' };
  },
};

export interface HandwritingPrompt {
  targetHanzi: string;
}

export interface HandwritingAnswer {
  /** Recognizer candidates, best first, exactly as returned by the Digital Ink port. */
  candidates: InkCandidate[];
}

const HandwritingAnswerSchema = z.object({
  candidates: z.array(z.object({ text: z.string(), score: z.number().nullable() })),
});

/**
 * Only the top recognizer candidate counts. A target that appears lower in the list is
 * reported as `in_alternatives` (eligible for retry/appeal) but is NOT correct (PRD-05).
 * Recognition does not assess stroke order.
 */
export const handwritingType: QuizTypeDefinition<HandwritingPrompt, HandwritingAnswer> = {
  id: 'handwriting',
  version: 1,
  skill: QUIZ_TYPE_SKILL.handwriting,
  parseAnswer: (input) => HandwritingAnswerSchema.parse(input),
  grade: (prompt, answer) => {
    const [top, ...rest] = answer.candidates;
    if (!top) return { correct: false, reason: 'no_candidates' };
    if (top.text === prompt.targetHanzi) return { correct: true, reason: 'top_candidate_match' };
    if (rest.some((c) => c.text === prompt.targetHanzi)) {
      return { correct: false, reason: 'in_alternatives' };
    }
    return { correct: false, reason: 'not_recognized' };
  },
};

/** Registry with the six built-in quiz types (D-002). */
export function createDefaultQuizTypeRegistry(): QuizTypeRegistry {
  return new QuizTypeRegistry()
    .register(choiceType('meaning_recognition'))
    .register(choiceType('hanzi_recognition'))
    .register(choiceType('pinyin_matching'))
    .register(choiceType('audio_recognition'))
    .register(dictationType)
    .register(handwritingType);
}
