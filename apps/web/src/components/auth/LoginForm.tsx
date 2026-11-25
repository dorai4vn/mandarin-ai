'use client';
import { useEffect, useState } from 'react';
import { Button, Input, PasswordInput } from '@/components/ui';
import { signInWithEmailPassword } from '@/lib/auth-password';
import { AUTH_CHANGED_EVENT, SUPABASE_CONFIGURED, supabase } from '@/lib/session';

/**
 * E-mail + password sign-in for accounts the owner created in the Supabase Dashboard (D-038,
 * D-042). No sign-up, no e-mail code; one generic error (no account enumeration).
 * X1 guards: no `name` on the fields, `method="post"`, inert until hydrated, password cleared
 * (and hidden again) after every attempt. The session is kept by supabase-js (D-042).
 */
export function LoginForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  const signIn = async () => {
    if (busy || !ready) return;
    setBusy(true);
    const sb = await supabase();
    if (!sb) {
      setBusy(false);
      return;
    }
    const res = await signInWithEmailPassword(sb.auth, email, password);
    // The password never outlives the attempt in component state, and is hidden again.
    setPassword('');
    setAttempts((n) => n + 1);
    setBusy(false);
    setMsg(res.message);
    if (res.ok) {
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
      onSignedIn?.();
    }
    // Failed attempt: back to the (now empty) password field (SCREEN_BLUEPRINTS_V2 §1).
    else requestAnimationFrame(() => document.getElementById('login-password')?.focus());
  };

  if (!SUPABASE_CONFIGURED)
    return (
      <p role="alert" data-testid="login-blocked" className="[overflow-wrap:anywhere]">
        BLOCKED — chưa cấu hình dự án Supabase (NEXT_PUBLIC_SUPABASE_URL /
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
      </p>
    );

  return (
    <>
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
          Chưa có tài khoản? Mandarin AI chỉ dành cho người được chủ ứng dụng cấp quyền — hãy liên
          hệ chủ ứng dụng. Quên mật khẩu: nhờ chủ ứng dụng đặt mật khẩu mới.
        </p>
      </form>
      {msg && (
        <p className="mt-2 text-sm" role="status" data-testid="login-message">
          {msg}
        </p>
      )}
    </>
  );
}
