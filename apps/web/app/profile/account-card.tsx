'use client';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ButtonLink, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Account (D-042): who is signed in on this device, and sign-out. No self-service management. */
export function AccountCard() {
  const auth = useAuth();
  return (
    <Card title="Tài khoản" headingLevel="h2" data-testid="account-card">
      {auth.status === 'signed-in' ? (
        <>
          <p className="text-sm text-fg-muted">Đang đăng nhập</p>
          <p className="mt-0.5 font-medium [overflow-wrap:anywhere]" data-testid="account-email">
            {auth.email ?? (auth.via === 'dev' ? 'Token phát triển' : '—')}
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            Đăng xuất sẽ xóa dữ liệu học lưu trên thiết bị này (dữ liệu đã đồng bộ vẫn còn trên máy
            chủ). Đổi mật khẩu: nhờ chủ ứng dụng.
          </p>
          <SignOutButton className="mt-4" />
        </>
      ) : auth.status === 'signed-out' ? (
        <>
          <p className="text-sm text-fg-muted">
            Ứng dụng riêng tư: đăng nhập bằng email và mật khẩu chủ ứng dụng đã tạo cho bạn.
          </p>
          <ButtonLink href="/login?next=/profile" className="mt-4" data-testid="account-sign-in">
            Đăng nhập
          </ButtonLink>
        </>
      ) : (
        <p className="text-sm text-fg-muted">Đang kiểm tra…</p>
      )}
    </Card>
  );
}
