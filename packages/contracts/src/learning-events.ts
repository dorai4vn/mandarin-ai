import { z } from 'zod';

/**
 * Envelope for append-only learning events. Study flows emit these from M3; the XP engine
 * consumes them in M7 (D-003). `idempotencyKey` is unique per user on the server.
 */
export const LearningEventEnvelopeSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  eventType: z.string().regex(/^[a-z]+(\.[a-z_]+)+$/),
  eventVersion: z.number().int().positive(),
  occurredAt: z.iso.datetime({ offset: true }),
  idempotencyKey: z.string().min(8).max(128),
  payload: z.record(z.string(), z.unknown()),
});
export type LearningEventEnvelope = z.infer<typeof LearningEventEnvelopeSchema>;
