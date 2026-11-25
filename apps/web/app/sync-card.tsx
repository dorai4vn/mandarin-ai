'use client';
import { SYNC_DISABLED_MESSAGE, useOffline } from '@/components/OfflineProvider';
import { Card } from '@/components/ui/index';

export function SyncCard() {
  const { online, pending, store, lastSync, syncAvailability } = useOffline();
  return (
    <Card title="Đồng bộ" data-testid="home-sync">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-fg-muted">Mạng</dt>
        <dd>{online ? 'Đang trực tuyến' : 'Offline'}</dd>
        <dt className="text-fg-muted">Lưu trữ</dt>
        <dd data-testid="store-kind">
          {store
            ? store.kind === 'indexeddb'
              ? 'IndexedDB (lâu dài)'
              : 'Bộ nhớ tạm (dự phòng)'
            : '…'}
        </dd>
        <dt className="text-fg-muted">Chờ gửi</dt>
        <dd>{pending}</dd>
        <dt className="text-fg-muted">Máy chủ</dt>
        <dd>
          {syncAvailability === 'disabled'
            ? 'Chưa kích hoạt'
            : lastSync?.source === 'mock'
              ? 'MOCK (RAM, không lưu lâu dài)'
              : lastSync?.source === 'live'
                ? 'Cơ sở dữ liệu'
                : '—'}
        </dd>
        <dt className="text-fg-muted">Lần cuối</dt>
        <dd>{lastSync ? new Date(lastSync.at).toLocaleTimeString('vi-VN') : '—'}</dd>
      </dl>
      {syncAvailability === 'disabled' && (
        <p className="mt-3 text-sm text-fg-muted" role="note" data-testid="sync-disabled-note">
          {SYNC_DISABLED_MESSAGE}
        </p>
      )}
    </Card>
  );
}
