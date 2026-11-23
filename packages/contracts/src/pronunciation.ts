import { z } from 'zod';
import { ResultSourceSchema } from './provenance.js';

export const PronunciationAssessmentRequestSchema = z.object({
  referenceText: z.string().min(1).max(200),
  locale: z.literal('zh-CN'),
  /** Base64 WAV (PCM 16 kHz, 16-bit, mono). Size is capped by the API. */
  audioBase64: z.string().min(1),
});
export type PronunciationAssessmentRequest = z.infer<typeof PronunciationAssessmentRequestSchema>;

/**
 * Scores exactly as returned by the provider. A dimension the provider did not return is
 * `null` and must be shown as "unavailable" — never estimated (PRD-06).
 */
export const PronunciationScoresSchema = z.object({
  accuracy: z.number().nullable(),
  fluency: z.number().nullable(),
  completeness: z.number().nullable(),
  prosody: z.number().nullable(),
  pronunciation: z.number().nullable(),
});
export type PronunciationScores = z.infer<typeof PronunciationScoresSchema>;

export const PronunciationAssessmentResultSchema = z.object({
  source: ResultSourceSchema,
  provider: z.string(),
  recognitionStatus: z.string(),
  recognizedText: z.string().nullable(),
  scores: PronunciationScoresSchema,
  words: z.array(
    z.object({
      word: z.string(),
      accuracy: z.number().nullable(),
      errorType: z.string().nullable(),
    }),
  ),
});
export type PronunciationAssessmentResult = z.infer<typeof PronunciationAssessmentResultSchema>;
