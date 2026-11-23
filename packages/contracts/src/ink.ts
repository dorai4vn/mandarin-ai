import { z } from 'zod';
import { ResultSourceSchema } from './provenance.js';

/** One touch sample. `t` is milliseconds since the stroke set started (monotonic). */
export const InkPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  t: z.number().finite().nonnegative(),
});
export type InkPoint = z.infer<typeof InkPointSchema>;

export const InkStrokeSchema = z.object({ points: z.array(InkPointSchema).min(1) });
export type InkStroke = z.infer<typeof InkStrokeSchema>;

export const InkRecognitionRequestSchema = z.object({
  /** BCP-47 tag understood by ML Kit Digital Ink, e.g. `zh-Hani-CN`. */
  languageTag: z.string().min(2),
  strokes: z.array(InkStrokeSchema).min(1),
  /** Optional writing area so the recognizer can use size context. */
  writingArea: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
});
export type InkRecognitionRequest = z.infer<typeof InkRecognitionRequestSchema>;

export const InkCandidateSchema = z.object({
  text: z.string(),
  /** ML Kit returns a score for some models only; lower is better. Null when unavailable. */
  score: z.number().nullable(),
});
export type InkCandidate = z.infer<typeof InkCandidateSchema>;

export const InkRecognitionResultSchema = z.object({
  source: ResultSourceSchema,
  candidates: z.array(InkCandidateSchema),
  modelId: z.string(),
});
export type InkRecognitionResult = z.infer<typeof InkRecognitionResultSchema>;
