import { z } from 'zod';

/**
 * Offline outbox operation (D-021). Immutable once created on the device; the server
 * dedupes by `operationId`, so replaying the same operation is always safe.
 */
export const SyncOperationSchema = z.object({
  /** Client-generated unique id (UUID v4/v7 or ULID). */
  operationId: z.string().regex(/^[0-9A-Za-z-]{16,64}$/),
  deviceId: z.string().min(8).max(64),
  /** e.g. `spike_note`, later `quiz_attempt`, `vocabulary_item`… */
  entityType: z.string().regex(/^[a-z][a-z_]{1,40}$/),
  opType: z.enum(['create', 'update', 'delete', 'event']),
  schemaVersion: z.number().int().positive(),
  /** Per-device monotonic counter for causal ordering. */
  logicalClock: z.number().int().nonnegative(),
  occurredAt: z.iso.datetime({ offset: true }),
  payload: z.record(z.string(), z.unknown()),
});
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export const SYNC_MAX_BATCH = 100;

export const SyncPushRequestSchema = z.object({
  operations: z.array(SyncOperationSchema).min(1).max(SYNC_MAX_BATCH),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;

export const SyncOperationResultSchema = z.object({
  operationId: z.string(),
  status: z.enum(['applied', 'duplicate', 'rejected']),
  serverVersion: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
});
export type SyncOperationResult = z.infer<typeof SyncOperationResultSchema>;

export const SyncPushResponseSchema = z.object({
  source: z.enum(['live', 'mock']),
  results: z.array(SyncOperationResultSchema),
});
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;

/** Pull (M1): operations stored on the server, in `serverSeq` order, for the caller only. */
export const SYNC_PULL_MAX = 500;

export const PulledSyncOperationSchema = SyncOperationSchema.extend({
  /** Server order (monotonic per user); the client keeps the highest one as its cursor. */
  serverSeq: z.number().int().positive(),
});
export type PulledSyncOperation = z.infer<typeof PulledSyncOperationSchema>;

export const SyncPullQuerySchema = z.object({
  after: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(SYNC_PULL_MAX).default(200),
});

export const SyncPullResponseSchema = z.object({
  source: z.enum(['live', 'mock']),
  operations: z.array(PulledSyncOperationSchema),
  /** Cursor for the next call (the last `serverSeq` returned, or the request's `after`). */
  nextAfter: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
