import type { SyncSummary } from './sync';
import type { SyncAvailability } from './sync-availability';

/** Shown wherever sync status appears while cloud sync is not enabled on the server (M0). */
export const SYNC_DISABLED_MESSAGE =
  'Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt.';

/** A sync run plus the state AFTER it (outbox counts, server availability). */
export type SyncResult = SyncSummary & {
  after: { pending: number; rejected: number; availability: SyncAvailability };
};

export interface SyncMessage {
  message: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
}

/**
 * Toast for a manual "Đồng bộ ngay", from the state AFTER the run (G1): "Đã đồng bộ" only when
 * nothing is pending or refused, sync is enabled and the server is real. An empty outbox, another
 * tab holding the sync lock, or a partial retry is never reported as success.
 */
export function describeSyncResult(r: SyncResult | null): SyncMessage {
  if (!r) return { message: 'Chưa thể đồng bộ lúc này.' };
  const { after } = r;
  if (after.rejected > 0)
    return { message: `${after.rejected} thao tác bị máy chủ từ chối.`, tone: 'error' };
  if (r.error === 'sync_unavailable' || after.availability === 'disabled')
    return { message: SYNC_DISABLED_MESSAGE };
  if (r.error === 'sync_status_unknown' || after.availability === 'unknown')
    return { message: 'Chưa kiểm tra được trạng thái đồng bộ. Dữ liệu vẫn ở trên thiết bị.' };
  if (r.error === 'server_not_persistent')
    return {
      message: 'Máy chủ chưa lưu được dữ liệu — thay đổi vẫn ở trên thiết bị.',
      tone: 'warning',
    };
  if (r.error) return { message: 'Đồng bộ chưa xong — sẽ tự thử lại.', tone: 'warning' };
  if (after.pending > 0) return { message: `Còn ${after.pending} thao tác chờ đồng bộ.` };
  const sent = r.applied + r.duplicate;
  if (sent === 0 && r.pulled > 0)
    return { message: `Đã nhận ${r.pulled} thay đổi từ thiết bị khác.` };
  if (sent === 0) return { message: 'Không có thay đổi nào cần đồng bộ.' };
  // A mock acknowledgement is not "saved on the server".
  if (r.source !== 'live') return { message: `Đã gửi ${sent} thao tác (máy chủ thử nghiệm MOCK).` };
  return { message: `Đã đồng bộ ${sent} thao tác.`, tone: 'success' };
}
