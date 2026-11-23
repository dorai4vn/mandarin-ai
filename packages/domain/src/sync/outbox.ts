import type { SyncOperation, SyncOperationResult } from '@mandarin/contracts';

export type OutboxStatus = 'pending' | 'rejected';

/** A queued operation on the device (D-021). Acknowledged operations are removed. */
export interface OutboxEntry {
  op: SyncOperation;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
}

/** Oldest-first (per-device logical clock) batch of pending operations. */
export function nextBatch(entries: readonly OutboxEntry[], max: number): SyncOperation[] {
  return entries
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.op.logicalClock - b.op.logicalClock || a.op.operationId.localeCompare(b.op.operationId))
    .slice(0, max)
    .map((e) => e.op);
}

export interface Reconciliation {
  /** Server stored it now or earlier — safe to delete locally. */
  acknowledged: string[];
  /** Server refused permanently — keep for the user to see, never resend automatically. */
  rejected: Array<{ operationId: string; error: string }>;
  /** Sent but not answered (e.g. partial response) — retry later. */
  retry: string[];
}

/**
 * Compares a sent batch with the server answer. Missing answers are retried, so a
 * dropped response can never lose an operation; duplicates count as acknowledged.
 */
export function reconcile(sent: readonly SyncOperation[], results: readonly SyncOperationResult[]): Reconciliation {
  const byId = new Map(results.map((r) => [r.operationId, r]));
  const out: Reconciliation = { acknowledged: [], rejected: [], retry: [] };
  for (const op of sent) {
    const r = byId.get(op.operationId);
    if (!r) out.retry.push(op.operationId);
    else if (r.status === 'rejected') out.rejected.push({ operationId: op.operationId, error: r.error ?? 'rejected' });
    else out.acknowledged.push(op.operationId);
  }
  return out;
}

/** Exponential backoff with cap, in ms. */
export function retryDelayMs(attempts: number, baseMs = 2000, capMs = 5 * 60_000): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, attempts));
}
