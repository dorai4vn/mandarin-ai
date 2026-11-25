'use client';

import { useEffect, useState } from 'react';
import { useOffline } from '../OfflineProvider';
import { CloseIcon } from '../icons';

/**
 * Offline banner (COMPONENT_SPEC_V2 §19, UI-4): a slim warning strip while the device is offline,
 * saying what still works. Truthful per sync availability: with cloud sync disabled the data stays
 * on this device (no promise to sync). Announced once (an always-mounted aria-live wrapper; the message appears in it);
 * can be collapsed — the Sync Indicator keeps showing "Offline". Never blocks the app.
 */
export function OfflineBanner() {
  const { online, syncAvailability, store } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  // A new offline period shows the banner again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (online) setDismissed(false);
  }, [online]);
  const show = !online && !dismissed;
  // Truthful copy: promise sending only when cloud sync is known to be enabled; say so when this
  // browser has no offline storage (memory store: lost on reload).
  const message =
    store?.kind === 'memory'
      ? 'Đang offline — trình duyệt này không lưu được dữ liệu offline; thay đổi sẽ mất khi tải lại trang.'
      : syncAvailability === 'disabled'
        ? 'Đang offline — bạn vẫn học được; thay đổi được lưu trên thiết bị này.'
        : syncAvailability === 'available'
          ? 'Đang offline — bạn vẫn học được; thay đổi được lưu trên máy và gửi khi có mạng.'
          : 'Đang offline — bạn vẫn học được; thay đổi được lưu trên máy và sẽ thử gửi khi có mạng (nếu đồng bộ được bật).';
  // The live region stays mounted (empty while online) so the message is announced when it
  // appears; a region inserted together with its text is often not read. aria-live without
  // role=status, so it never collides with the pages' own status elements (getByRole('status')).
  return (
    <div aria-live="polite" data-testid="offline-banner-live">
      {show && (
        <div
          data-testid="offline-banner"
          className="flex items-start gap-2 border-b border-warning/40 bg-warning-subtle px-4 py-2 text-sm text-warning-text md:px-6 lg:px-8"
        >
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" />
          <span className="min-w-0 flex-1">{message}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Thu gọn thông báo offline"
            className="-my-1.5 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-control hover:bg-[var(--state-hover)]"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}
