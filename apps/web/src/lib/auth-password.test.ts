import { describe, expect, it, vi } from 'vitest';
import {
  INVALID_EMAIL,
  INVALID_LOGIN,
  MISSING_PASSWORD,
  RATE_LIMITED,
  SIGNED_IN,
  UNAVAILABLE,
  signInWithEmailPassword,
  type PasswordAuthClient,
} from './auth-password';

function client(error: { status?: number; code?: string; message: string } | null) {
  const signInWithPassword = vi.fn<PasswordAuthClient['signInWithPassword']>(async () => ({
    error,
  }));
  return { auth: { signInWithPassword }, signInWithPassword };
}

describe('signInWithEmailPassword (D-038)', () => {
  it('calls only signInWithPassword with the normalized e-mail and the exact password', async () => {
    const { auth, signInWithPassword } = client(null);
    const res = await signInWithEmailPassword(auth, '  Ban.Be@Example.com ', ' mật khẩu dài 12+ ');
    expect(res).toEqual({ ok: true, message: SIGNED_IN });
    expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: 'ban.be@example.com',
      password: ' mật khẩu dài 12+ ',
    });
    expect(Object.keys(auth)).toEqual(['signInWithPassword']);
  });

  it('wrong password, unknown e-mail, unconfirmed and banned accounts look identical', async () => {
    const errors = [
      { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
      { status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' },
      { status: 400, code: 'user_banned', message: 'User is banned' },
      { status: 422, code: 'validation_failed', message: 'whatever' },
    ];
    const results = await Promise.all(
      errors.map((e) => signInWithEmailPassword(client(e).auth, 'a@example.com', 'x')),
    );
    for (const r of results) expect(r).toEqual({ ok: false, message: INVALID_LOGIN });
  });

  it('rate limit and outages get their own message, without account details', async () => {
    expect(
      await signInWithEmailPassword(
        client({ status: 429, code: 'over_request_rate_limit', message: 'x' }).auth,
        'a@example.com',
        'x',
      ),
    ).toEqual({ ok: false, message: RATE_LIMITED });
    expect(
      await signInWithEmailPassword(
        client({ status: 503, message: 'down' }).auth,
        'a@example.com',
        'x',
      ),
    ).toEqual({ ok: false, message: UNAVAILABLE });
    const throwing: PasswordAuthClient = {
      signInWithPassword: () => Promise.reject(new Error('network')),
    };
    expect(await signInWithEmailPassword(throwing, 'a@example.com', 'x')).toEqual({
      ok: false,
      message: UNAVAILABLE,
    });
  });

  it('rejects bad input locally without calling Supabase', async () => {
    const { auth, signInWithPassword } = client(null);
    expect(await signInWithEmailPassword(auth, 'not-an-email', 'x')).toEqual({
      ok: false,
      message: INVALID_EMAIL,
    });
    expect(await signInWithEmailPassword(auth, 'a@example.com', '')).toEqual({
      ok: false,
      message: MISSING_PASSWORD,
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
