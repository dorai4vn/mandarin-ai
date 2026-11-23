import { z } from 'zod';
import { InkStrokeSchema } from './ink.js';
import { ResultSourceSchema } from './provenance.js';

/** Hard limits so a single request cannot exhaust the recognizer. */
export const HANDWRITING_LIMITS = { maxStrokes: 64, maxPointsTotal: 4000 } as const;

/**
 * Strokes captured from any pointer type (touch, mouse, pen) via Pointer Events.
 * Coordinates are canvas CSS pixels; `t` is ms since the first point.
 */
export const HandwritingRecognitionRequestSchema = z
  .object({
    strokes: z.array(InkStrokeSchema).min(1).max(HANDWRITING_LIMITS.maxStrokes),
    writingArea: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
    /** Pointer type the strokes came from — analytics/evaluation only, never changes grading. */
    pointerType: z.enum(['touch', 'mouse', 'pen', 'unknown']).default('unknown'),
    limit: z.number().int().min(1).max(20).default(8),
  })
  .refine((r) => r.strokes.reduce((n, s) => n + s.points.length, 0) <= HANDWRITING_LIMITS.maxPointsTotal, {
    message: `At most ${HANDWRITING_LIMITS.maxPointsTotal} points`,
  });
export type HandwritingRecognitionRequest = z.input<typeof HandwritingRecognitionRequestSchema>;
export type HandwritingRecognitionRequestParsed = z.output<typeof HandwritingRecognitionRequestSchema>;

export const HandwritingCandidateSchema = z.object({
  text: z.string(),
  /** Adapter-specific score; interpret with `scoreOrder`. Null when not provided. */
  score: z.number().nullable(),
});
export type HandwritingCandidate = z.infer<typeof HandwritingCandidateSchema>;

export const HandwritingRecognitionResultSchema = z.object({
  source: ResultSourceSchema,
  /** Which adapter produced the result, e.g. `hanzilookup-mmah` or `mock`. */
  adapterId: z.string(),
  /** Candidates best first. */
  candidates: z.array(HandwritingCandidateSchema),
  scoreOrder: z.enum(['higher_is_better', 'lower_is_better', 'none']),
  latencyMs: z.number().nonnegative(),
});
export type HandwritingRecognitionResult = z.infer<typeof HandwritingRecognitionResultSchema>;
