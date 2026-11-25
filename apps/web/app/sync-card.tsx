'use client';
import Link from 'next/link';
import { SYNC_DISABLED_MESSAGE, useOffline } from '@/components/OfflineProvider';
import { Card } from '@/components/ui';

export function SyncCard() {
  const { online, pending, store, lastSync, syncAvailability, signedIn } = useOffline();
  return (
    <Card title="Đồng bộ" data-testid="home-sync">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-fg-muted">Mạng</dt>
        <dd>{online ? 'Đang trực tuyến' : 'Offline'}</dd>
        <dt className="text-fg-muted">Lưu trữ</dt>
        <dd data-testid="store-kind">
          {!signedIn
            ? 'Chưa đăng nhập'
            : store
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
      {!signedIn && (
        <p className="mt-3 text-sm text-fg-muted" data-testid="home-sync-signed-out">
          <Link href="/login" className="font-medium text-link underline underline-offset-2">
            Đăng nhập
          </Link>{' '}
          để lưu và đồng bộ dữ liệu học của bạn.
        </p>
      )}
      {syncAvailability === 'disabled' && (
        <p className="mt-3 text-sm text-fg-muted" role="note" data-testid="sync-disabled-note">
          {SYNC_DISABLED_MESSAGE}
        </p>
      )}
    </Card>
  );
}
