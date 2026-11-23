import type { SyncOperation } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { nextBatch, reconcile, retryDelayMs, type OutboxEntry } from './outbox.js';

const op = (id: string, clock: number): SyncOperation => ({
  operationId: id.padEnd(16, '0'),
  deviceId: 'device-12345678',
  entityType: 'spike_note',
  opType: 'create',
  schemaVersion: 1,
  logicalClock: clock,
  occurredAt: '2026-11-23T10:00:00+07:00',
  payload: {},
});
const entry = (o: SyncOperation, status: OutboxEntry['status'] = 'pending'): OutboxEntry => ({
  op: o,
  status,
  attempts: 0,
  lastError: null,
});

describe('outbox', () => {
  it('batches pending operations in causal order and skips rejected ones', () => {
    const batch = nextBatch(
      [entry(op('c', 3)), entry(op('a', 1)), entry(op('r', 0), 'rejected'), entry(op('b', 2))],
      2,
    );
    expect(batch.map((o) => o.logicalClock)).toEqual([1, 2]);
  });

  it('treats duplicates as acknowledged and retries unanswered operations', () => {
    const sent = [op('a', 1), op('b', 2), op('c', 3)];
    const r = reconcile(sent, [
      { operationId: sent[0]!.operationId, status: 'applied', serverVersion: 1, error: null },
      { operationId: sent[1]!.operationId, status: 'duplicate', serverVersion: 1, error: null },
    ]);
    expect(r.acknowledged).toEqual([sent[0]!.operationId, sent[1]!.operationId]);
    expect(r.retry).toEqual([sent[2]!.operationId]);
  });

  it('keeps rejected operations out of the retry loop', () => {
    const sent = [op('a', 1)];
    const r = reconcile(sent, [
      {
        operationId: sent[0]!.operationId,
        status: 'rejected',
        serverVersion: null,
        error: 'forbidden',
      },
    ]);
    expect(r.rejected).toEqual([{ operationId: sent[0]!.operationId, error: 'forbidden' }]);
    expect(r.retry).toEqual([]);
  });

  it('backs off exponentially with a cap', () => {
    expect(retryDelayMs(0)).toBe(2000);
    expect(retryDelayMs(3)).toBe(16000);
    expect(retryDelayMs(50)).toBe(300000);
  });
});
