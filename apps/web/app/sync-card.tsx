'use client';
import { useOffline } from '@/components/OfflineProvider';
import { Card } from '@/components/ui';

export function SyncCard() {
  const { online, pending, store, lastSync } = useOffline();
  return (
    <Card title="Đồng bộ">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-2">Mạng</dt>
        <dd>{online ? 'Đang trực tuyến' : 'Offline'}</dd>
        <dt className="text-ink-2">Lưu trữ</dt>
        <dd data-testid="store-kind">
          {store
            ? store.kind === 'indexeddb'
              ? 'IndexedDB (lâu dài)'
              : 'Bộ nhớ tạm (dự phòng)'
            : '…'}
        </dd>
        <dt className="text-ink-2">Chờ gửi</dt>
        <dd>{pending}</dd>
        <dt className="text-ink-2">Máy chủ</dt>
        <dd>
          {lastSync?.source === 'mock'
            ? 'MOCK (RAM, không lưu lâu dài)'
            : lastSync?.source === 'live'
              ? 'Cơ sở dữ liệu'
              : '—'}
        </dd>
        <dt className="text-ink-2">Lần cuối</dt>
        <dd>{lastSync ? new Date(lastSync.at).toLocaleTimeString('vi-VN') : '—'}</dd>
      </dl>
    </Card>
  );
}
