'use client';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Button, Card, PageHeader, PasswordInput } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEV_TOKEN_ENABLED, readDevToken, writeDevToken } from '@/lib/session';

/**
 * Session lab: the real sign-in form (same as /login) plus, in dev builds only, a dev access token
 * for testing the API without Supabase. Accounts are created by the owner (D-042).
 */
export default function SessionLab() {
  const auth = useAuth();
  const [devToken, setDevToken] = useState('');
  const [hasDevToken, setHasDevToken] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDevToken(Boolean(readDevToken()));
  }, []);

  return (
    <>
      <PageHeader
        title="Phiên đăng nhập"
        lead="Mandarin AI là ứng dụng riêng tư: chỉ tài khoản do chủ ứng dụng tạo mới đăng nhập được. Đăng nhập bằng email và mật khẩu — hoạt động trong tab trình duyệt và trong ứng dụng đã cài."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Đăng nhập">
          {auth.status === 'signed-in' && auth.via === 'supabase' ? (
            <div>
              <p data-testid="login-signed-in">
                Đã đăng nhập{auth.email ? ` (${auth.email})` : ''}.
              </p>
              <SignOutButton className="mt-3" />
            </div>
          ) : (
            <LoginForm />
          )}
        </Card>
        {DEV_TOKEN_ENABLED && (
          <Card title="Token phát triển (chỉ môi trường dev)">
            <p className="text-sm text-fg-muted">
              Dán access token để thử các API khi chưa có Supabase. Lưu trong sessionStorage của tab
              này.
            </p>
            <PasswordInput
              label="Access token"
              value={devToken}
              onChange={(e) => setDevToken(e.target.value)}
              autoComplete="off"
              className="mt-3"
            />
            <div className="mt-2 flex gap-2">
              <Button
                onClick={() => {
                  writeDevToken(devToken.trim() || null);
                  setHasDevToken(Boolean(devToken.trim()));
                  setDevToken('');
                }}
              >
                Lưu
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  writeDevToken(null);
                  setHasDevToken(false);
                }}
              >
                Xóa
              </Button>
            </div>
            <p className="mt-2 text-sm" data-testid="dev-token-state">
              {hasDevToken ? 'Đang dùng token phát triển.' : 'Chưa có token.'}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
