'use client';
import { useEffect, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { DEV_TOKEN_ENABLED, readDevToken, supabase, writeDevToken } from '@/lib/session';

/** M0: e-mail OTP via Supabase when configured (D-025); dev token field for local testing only. */
export default function SessionLab() {
  const sb = supabase();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const [msg, setMsg] = useState<string | null>(null);
  const [devToken, setDevToken] = useState('');
  const [hasDevToken, setHasDevToken] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDevToken(Boolean(readDevToken()));
    void sb?.auth.getSession().then(({ data }) => data.session && setStage('done'));
  }, [sb]);

  const sendCode = async () => {
    if (!sb) return;
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) setMsg(`Không gửi được mã: ${error.message}`);
    else {
      setStage('code');
      setMsg('Đã gửi mã 6 số tới email của bạn.');
    }
  };

  const verify = async () => {
    if (!sb) return;
    const { error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) setMsg(`Mã không đúng hoặc đã hết hạn: ${error.message}`);
    else {
      setStage('done');
      setMsg('Đăng nhập thành công.');
    }
  };

  return (
    <>
      <PageHeader
        title="Phiên đăng nhập"
        lead="Đăng nhập bằng mã OTP qua email — hoạt động trong tab trình duyệt và trong ứng dụng đã cài."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Mã OTP qua email (Supabase)">
          {!sb ? (
            <p role="alert" data-testid="otp-blocked">
              BLOCKED — chưa cấu hình dự án Supabase (NEXT_PUBLIC_SUPABASE_URL /
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
            </p>
          ) : stage === 'done' ? (
            <div>
              <p>Đã đăng nhập.</p>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => void sb.auth.signOut().then(() => setStage('email'))}
              >
                Đăng xuất
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (stage === 'email' ? sendCode() : verify());
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.vn"
                autoComplete="email"
                className="rounded-xl border border-line bg-paper px-3 py-2"
              />
              {stage === 'code' && (
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Mã 6 số"
                  className="rounded-xl border border-line bg-paper px-3 py-2"
                />
              )}
              <Button type="submit">{stage === 'email' ? 'Gửi mã' : 'Xác nhận'}</Button>
            </form>
          )}
          {msg && <p className="mt-2 text-sm">{msg}</p>}
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
