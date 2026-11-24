'use client';
import { useEffect, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { signInWithEmailPassword } from '@/lib/auth-password';
import { DEV_TOKEN_ENABLED, readDevToken, supabase, writeDevToken } from '@/lib/session';

/**
 * M0 test sign-in (D-038): e-mail + password for accounts an administrator created in Supabase.
 * No sign-up, no e-mail code; error messages never reveal whether an account exists.
 * Membership checks, forced password change and cookie sessions are M1.
 * Dev token field is for local testing only.
 */
export default function SessionLab() {
  const sb = supabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devToken, setDevToken] = useState('');
  const [hasDevToken, setHasDevToken] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDevToken(Boolean(readDevToken()));
    void sb?.auth.getSession().then(({ data }) => data.session && setSignedIn(true));
  }, [sb]);

  const signIn = async () => {
    if (!sb || busy) return;
    setBusy(true);
    const res = await signInWithEmailPassword(sb.auth, email, password);
    // The password never outlives the attempt in component state.
    setPassword('');
    setBusy(false);
    setMsg(res.message);
    if (res.ok) setSignedIn(true);
  };

  return (
    <>
      <PageHeader
        title="Phiên đăng nhập"
        lead="Mandarin AI là ứng dụng riêng tư: chỉ tài khoản do quản trị viên tạo và cấp quyền mới đăng nhập được. Đăng nhập bằng email và mật khẩu — hoạt động trong tab trình duyệt và trong ứng dụng đã cài."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Đăng nhập">
          {!sb ? (
            <p role="alert" data-testid="login-blocked">
              BLOCKED — chưa cấu hình dự án Supabase (NEXT_PUBLIC_SUPABASE_URL /
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
            </p>
          ) : signedIn ? (
            <div>
              <p data-testid="login-signed-in">Đã đăng nhập.</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  void sb.auth.signOut().then(() => {
                    setSignedIn(false);
                    setMsg(null);
                  })
                }
              >
                Đăng xuất
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void signIn();
              }}
            >
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.vn"
                autoComplete="username"
                aria-label="Email"
                data-testid="login-email"
                className="rounded-xl border border-line bg-paper px-3 py-2"
              />
              <input
                type="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                aria-label="Mật khẩu"
                data-testid="login-password"
                className="rounded-xl border border-line bg-paper px-3 py-2"
              />
              <Button type="submit" disabled={busy} data-testid="login-submit">
                {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
              <p className="text-sm text-ink-2" data-testid="invite-only-note">
                Chưa có tài khoản? Mandarin AI chỉ dành cho người được chủ ứng dụng cấp quyền — hãy
                liên hệ chủ ứng dụng. Quên mật khẩu: nhờ quản trị viên cấp mật khẩu tạm mới.
              </p>
            </form>
          )}
          {msg && (
            <p className="mt-2 text-sm" role="status" data-testid="login-message">
              {msg}
            </p>
          )}
        </Card>
        {DEV_TOKEN_ENABLED && (
          <Card title="Token phát triển (chỉ môi trường dev)">
            <p className="text-sm text-ink-2">
              Dán access token để thử các API khi chưa có Supabase. Lưu trong sessionStorage của tab
              này.
            </p>
            <input
              value={devToken}
              onChange={(e) => setDevToken(e.target.value)}
              type="password"
              aria-label="Access token"
              className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2"
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
                variant="ghost"
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
