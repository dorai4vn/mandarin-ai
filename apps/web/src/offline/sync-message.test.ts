import { describe, expect, it } from 'vitest';
import { SYNC_DISABLED_MESSAGE, describeSyncResult, type SyncResult } from './sync-message';

const run = (
  p: Partial<SyncResult> = {},
  after: Partial<SyncResult['after']> = {},
): SyncResult => ({
  applied: 0,
  duplicate: 0,
  rejected: 0,
  retried: 0,
  pulled: 0,
  source: null,
  error: null,
  ...p,
  after: { pending: 0, rejected: 0, availability: 'available', ...after },
});

describe('describeSyncResult (G1: "Đã đồng bộ" only when it is true)', () => {
  it('live run, nothing left → success', () => {
    expect(describeSyncResult(run({ applied: 2, source: 'live' }))).toEqual({
      message: 'Đã đồng bộ 2 thao tác.',
      tone: 'success',
    });
  });
  it('empty outbox → no success claim', () => {
    const m = describeSyncResult(run());
    expect(m.message).toBe('Không có thay đổi nào cần đồng bộ.');
    expect(m.tone).toBeUndefined();
  });
  it('sync disabled, empty outbox → the local-only message, never "Đã đồng bộ"', () => {
    expect(describeSyncResult(run({}, { availability: 'disabled' })).message).toBe(
      SYNC_DISABLED_MESSAGE,
    );
    expect(describeSyncResult(run({ error: 'sync_unavailable' }, { pending: 2 })).message).toBe(
      SYNC_DISABLED_MESSAGE,
    );
  });
  it('earlier refusals are reported even when this run refused nothing', () => {
    expect(describeSyncResult(run({}, { rejected: 1 }))).toEqual({
      message: '1 thao tác bị máy chủ từ chối.',
      tone: 'error',
    });
  });
  it('another tab holds the lock / partial retry → still pending, no success', () => {
    const m = describeSyncResult(run({ applied: 1, source: 'live' }, { pending: 3 }));
    expect(m.message).toBe('Còn 3 thao tác chờ đồng bộ.');
    expect(m.tone).toBeUndefined();
  });
  it('unknown status, mock server and transport errors are not success', () => {
    expect(describeSyncResult(run({ error: 'sync_status_unknown' })).message).toMatch(
      /Chưa kiểm tra/,
    );
    expect(describeSyncResult(run({ error: 'server_not_persistent' })).tone).toBe('warning');
    expect(describeSyncResult(run({ error: 'network' })).message).toMatch(/sẽ tự thử lại/);
    const mock = describeSyncResult(run({ applied: 1, source: 'mock' }));
    expect(mock.message).toMatch(/MOCK/);
    expect(mock.tone).toBeUndefined();
  });
  it('changes received from another device are reported without claiming a push', () => {
    expect(describeSyncResult(run({ pulled: 2, source: 'live' })).message).toBe(
      'Đã nhận 2 thay đổi từ thiết bị khác.',
    );
  });
  it('no run (offline / not ready)', () => {
    expect(describeSyncResult(null).message).toBe('Chưa thể đồng bộ lúc này.');
  });
});
