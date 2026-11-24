import { describe, expect, it } from 'vitest';
import {
  INVALID_CODE,
  INVALID_EMAIL,
  NEUTRAL_CODE_SENT,
  RATE_LIMITED,
  requestSignInCode,
  verifySignInCode,
  type OtpAuthClient,
} from './auth-otp';

type Err = { status?: number; code?: string; message: string } | null;

function fakeAuth(otpError: Err = null, verifyError: Err = null) {
  const calls: unknown[] = [];
  const client: OtpAuthClient = {
    async signInWithOtp(params) {
      calls.push(params);
      return { error: otpError };
    },
    async verifyOtp(params) {
      calls.push(params);
      return { error: verifyError };
    },
  };
  return { client, calls };
}

describe('invitation-only sign-in (D-037)', () => {
  it('never asks Supabase to create a user', async () => {
    const { client, calls } = fakeAuth();
    await requestSignInCode(client, '  Ban.Be@Example.COM ');
    expect(calls).toEqual([{ email: 'ban.be@example.com', options: { shouldCreateUser: false } }]);
  });

  it('shows the same neutral message for an invited and a non-invited e-mail', async () => {
    const invited = await requestSignInCode(fakeAuth(null).client, 'a@example.com');
    const unknown = await requestSignInCode(
      fakeAuth({ status: 422, code: 'otp_disabled', message: 'Signups not allowed for otp' })
        .client,
      'stranger@example.com',
    );
    expect(invited).toEqual({ ok: true, message: NEUTRAL_CODE_SENT });
    expect(unknown).toEqual(invited);
    expect(JSON.stringify(unknown)).not.toMatch(/signup|not allowed|không tồn tại/i);
  });

  it('reports rate limiting without revealing account existence, and validates input', async () => {
    const limited = await requestSignInCode(
      fakeAuth({ status: 429, code: 'over_email_send_rate_limit', message: 'x' }).client,
      'a@example.com',
    );
    expect(limited).toEqual({ ok: false, message: RATE_LIMITED });
    const { client, calls } = fakeAuth();
    expect(await requestSignInCode(client, 'not-an-email')).toEqual({
      ok: false,
      message: INVALID_EMAIL,
    });
    expect(calls).toHaveLength(0);
  });

  it('verifies 6-digit codes with one generic error message', async () => {
    const ok = await verifySignInCode(fakeAuth().client, 'a@example.com', '123 456');
    expect(ok.ok).toBe(true);
    const wrong = await verifySignInCode(
      fakeAuth(null, {
        status: 403,
        code: 'otp_expired',
        message: 'Token has expired or is invalid',
      }).client,
      'a@example.com',
      '123456',
    );
    expect(wrong).toEqual({ ok: false, message: INVALID_CODE });
    expect(await verifySignInCode(fakeAuth().client, 'a@example.com', '12ab')).toEqual({
      ok: false,
      message: INVALID_CODE,
    });
  });
});
