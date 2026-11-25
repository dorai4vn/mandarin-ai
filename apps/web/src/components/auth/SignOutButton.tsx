'use client';
import { useState } from 'react';
import { useOffline } from '@/components/OfflineProvider';
import { Button, Dialog } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * Sign-out (D-042, AUTH_SESSION_DESIGN §3): try to send what is still queued; if something is
 * left, ask before discarding it; then delete this account's local database and end the session.
 */
export function SignOutButton({ className }: { className?: string }) {
  const auth = useAuth();
  const offline = useOffline();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);

  const finish = async () => {
    setConfirm(null);
    setBusy(true);
    await offline.forgetLocalData();
    await auth.signOut();
    // Full reload: no in-memory state of the previous account survives (D-042).
    window.location.replace(new URL('/login', window.location.href).href);
  };

  const start = async () => {
    setBusy(true);
    const r = await offline.syncNow({ force: true });
    const left = r ? r.after.pending + r.after.rejected : offline.pending + offline.rejected;
    setBusy(false);
    if (left > 0) setConfirm(left);
    else await finish();
  };

  return (
    <>
      <Button
        variant="secondary"
        className={className}
        loading={busy}
        onClick={() => void start()}
        data-testid="sign-out"
      >
        Đăng xuất
      </Button>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Đăng xuất?"
        description={`Còn ${confirm ?? 0} thay đổi chưa gửi lên máy chủ. Đăng xuất sẽ xóa chúng khỏi thiết bị này.`}
        data-testid="sign-out-confirm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => void finish()} data-testid="sign-out-discard">
              Đăng xuất và xóa
            </Button>
          </>
        }
      />
    </>
  );
}
