'use client';
import { useEffect, useState } from 'react';
import { Button, Card, Input, PageHeader, PasswordInput } from '@/components/ui/index';
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
  // X1: the server-rendered form is inert until React has hydrated and owns onSubmit. Before that
  // the inputs and the button are disabled, so the browser can never submit credentials natively.
  const [ready, setReady] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    setHasDevToken(Boolean(readDevToken()));
    void sb?.auth.getSession().then(({ data }) => data.session && setSignedIn(true));
  }, [sb]);

  const signIn = async () => {
    if (!sb || busy || !ready) return;
    setBusy(true);
    const res = await signInWithEmailPassword(sb.auth, email, password);
    // The password never outlives the attempt in component state, and is hidden again.
    setPassword('');
    setAttempts((n) => n + 1);
    setBusy(false);
    setMsg(res.message);
    if (res.ok) setSignedIn(true);
    // Failed attempt: back to the (now empty) password field (SCREEN_BLUEPRINTS_V2 §1).
    else requestAnimationFrame(() => document.getElementById('login-password')?.focus());
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
            <p role="alert" data-testid="login-blocked" className="[overflow-wrap:anywhere]">
              BLOCKED — chưa cấu hình dự án Supabase (NEXT_PUBLIC_SUPABASE_URL /
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
            </p>
          ) : signedIn ? (
            <div>
              <p data-testid="login-signed-in">Đã đăng nhập.</p>
              <Button
                variant="secondary"
                className="mt-3"
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
              // X1 defence in depth: even if a native submission were forced (e.g. the disabled
              // attributes removed by hand), POST keeps it out of the URL and the fields carry no
              // `name`, so the browser serializes nothing — there is no server handler either.
              method="post"
              aria-busy={!ready}
              className="flex max-w-[400px] flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void signIn();
              }}
            >
              <noscript>
                <p role="alert" className="text-sm">
                  Cần bật JavaScript để đăng nhập.
                </p>
              </noscript>
              <Input
                label="Email"
                type="email"
                id="login-email"
                required
                disabled={!ready}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.vn"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="next"
                data-testid="login-email"
              />
              <PasswordInput
                label="Mật khẩu"
                id="login-password"
                required
                disabled={!ready}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                enterKeyHint="go"
                concealSignal={attempts}
                data-testid="login-password"
              />
              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={!ready}
                loading={busy}
                data-testid="login-submit"
                className="mt-2"
              >
                {!ready ? 'Đang tải…' : busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
              <p className="text-sm text-fg-muted" data-testid="invite-only-note">
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
