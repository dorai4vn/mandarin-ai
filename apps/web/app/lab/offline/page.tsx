'use client';
import type { OutboxEntry } from '@mandarin/domain';
import { useCallback, useEffect, useState } from 'react';
import { SYNC_DISABLED_MESSAGE, useOffline } from '@/components/OfflineProvider';
import { Button, Card, Mono, PageHeader } from '@/components/ui';
import type { SpikeNote } from '@/offline/store';

export default function OfflineLab() {
  const { store, online, pending, lastSync, syncAvailability, refresh, syncNow } = useOffline();
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<SpikeNote[]>([]);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [persisted, setPersisted] = useState<string>('—');

  const reload = useCallback(async () => {
    if (!store) return;
    setNotes(await store.listNotes());
    setOutbox(await store.listOutbox());
  }, [store]);

  useEffect(() => {
    // Reload local data whenever the store or pending count changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload, pending]);

  const add = async () => {
    if (!store || !text.trim()) return;
    await store.addNote(text.trim());
    setText('');
    await refresh();
    await reload();
    if (navigator.onLine) await syncNow();
  };

  const askPersist = async () => {
    if (!navigator.storage?.persist) return setPersisted('trình duyệt không hỗ trợ');
    setPersisted(
      (await navigator.storage.persist())
        ? 'được giữ lâu dài'
        : 'trình duyệt từ chối (có thể bị xóa khi thiếu dung lượng)',
    );
  };

  return (
    <>
      <PageHeader
        title="Offline & đồng bộ"
        lead="Ghi chú thử nghiệm được lưu trên máy ngay, rồi gửi lên máy chủ đúng một lần khi có mạng."
      />
      {store?.kind === 'memory' && (
        <p
          role="alert"
          data-testid="memory-fallback"
          className="mb-4 rounded-xl border-2 border-warning-text p-3 text-sm"
        >
          Trình duyệt này không cho lưu trữ offline (IndexedDB). Ứng dụng vẫn hoạt động khi có mạng;
          dữ liệu chưa gửi sẽ mất nếu đóng trang.
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card title="Thêm ghi chú">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ví dụ: 山 = núi"
              aria-label="Nội dung ghi chú"
              data-testid="note-input"
              disabled={!store}
              className="min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 py-2"
            />
            <Button type="submit" data-testid="note-add" disabled={!store}>
              Lưu
            </Button>
          </form>
          <ul className="mt-3 divide-y divide-line" data-testid="note-list">
            {notes.map((n) => (
              <li key={n.id} className="py-2">
                {n.text}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Trạng thái">
          <Mono>
            <span data-testid="offline-status">{`mạng=${online ? 'online' : 'offline'} lưu_trữ=${store?.kind ?? '…'} chờ=${pending}`}</span>
            {`\nthiết bị=${store?.deviceId ?? '…'}`}
            {lastSync && (
              <span data-testid="last-sync">{`\nlần cuối: applied=${lastSync.applied} duplicate=${lastSync.duplicate} rejected=${lastSync.rejected} retried=${lastSync.retried} source=${lastSync.source ?? '—'}${lastSync.error ? ` lỗi=${lastSync.error}` : ''}`}</span>
            )}
          </Mono>
          {syncAvailability === 'disabled' && (
            <p
              role="note"
              data-testid="sync-disabled-note"
              className="mt-2 rounded-lg border border-line p-2 text-sm"
            >
              {SYNC_DISABLED_MESSAGE} Các ghi chú vẫn nằm trong hàng đợi và sẽ được gửi khi máy chủ
              bật đồng bộ (M1).
            </p>
          )}
          {lastSync?.source === 'mock' && (
            <p
              role="note"
              data-testid="mock-sync-note"
              className="mt-2 rounded-lg border-2 border-warning-text p-2 text-sm"
            >
              Máy chủ đồng bộ đang ở chế độ MOCK: dữ liệu chỉ nằm trong bộ nhớ RAM của API, không
              phải cơ sở dữ liệu, và mất khi API khởi động lại (cơ sở dữ liệu thật làm ở M1).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => void syncNow({ force: true })}
              disabled={!online}
              data-testid="sync-now"
            >
              Đồng bộ ngay
            </Button>
            <Button variant="ghost" onClick={() => void askPersist()}>
              Xin giữ dữ liệu lâu dài
            </Button>
          </div>
          <p className="mt-2 text-sm text-fg-muted">Lưu trữ lâu dài: {persisted}</p>
          <h3 className="mt-4 font-semibold">Hàng đợi (outbox)</h3>
          <ul className="text-sm" data-testid="outbox">
            {outbox.map((e) => (
              <li key={e.op.operationId}>
                #{e.op.logicalClock} {e.status} · thử {e.attempts} lần
                {e.lastError ? ` · ${e.lastError}` : ''}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
