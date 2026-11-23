import { z } from 'zod';
import { ResultSourceSchema } from './provenance.js';

/** Short-lived credential for an OpenAI Realtime session, minted by the backend (D-004). */
export const RealtimeSessionGrantSchema = z.object({
  source: ResultSourceSchema,
  clientSecret: z.string().min(1),
  /** ISO-8601 expiry. */
  expiresAt: z.string(),
  model: z.string(),
});
export type RealtimeSessionGrant = z.infer<typeof RealtimeSessionGrantSchema>;
