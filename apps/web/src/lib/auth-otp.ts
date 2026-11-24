/**
 * Sign-in with a 6-digit e-mail code for accounts created/invited by an administrator (D-037).
 * There is NO sign-up: requests always use `shouldCreateUser: false`, and the UI shows the same
 * neutral message whether or not the e-mail has an account (no account enumeration).
 */
export interface OtpAuthClient {
  signInWithOtp(params: {
    email: string;
    options: { shouldCreateUser: false };
  }): Promise<{ error: { status?: number; code?: string; message: string } | null }>;
  verifyOtp(params: {
    email: string;
    token: string;
    type: 'email';
  }): Promise<{ error: { status?: number; code?: string; message: string } | null }>;
}

export const NEUTRAL_CODE_SENT =
  'Nếu email này đã được quản trị viên cấp quyền, bạn sẽ nhận được mã 6 số trong vài phút. Kiểm tra cả thư rác.';
export const RATE_LIMITED = 'Bạn đã yêu cầu mã quá nhiều lần. Hãy đợi vài phút rồi thử lại.';
export const INVALID_EMAIL = 'Email không hợp lệ.';
export const INVALID_CODE = 'Mã không đúng hoặc đã hết hạn.';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type RequestCodeResult = { ok: true; message: string } | { ok: false; message: string };

/** Requests a sign-in code. Never creates an account; never reveals whether the e-mail exists. */
export async function requestSignInCode(
  auth: OtpAuthClient,
  rawEmail: string,
): Promise<RequestCodeResult> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL.test(email)) return { ok: false, message: INVALID_EMAIL };
  const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error && (error.status === 429 || /rate/i.test(error.code ?? ''))) {
    return { ok: false, message: RATE_LIMITED };
  }
  // Unknown e-mail ("Signups not allowed for otp"), success and other errors look the same.
  return { ok: true, message: NEUTRAL_CODE_SENT };
}

/** Verifies the 6-digit code. Error text is the same for wrong, expired or unknown accounts. */
export async function verifySignInCode(
  auth: OtpAuthClient,
  rawEmail: string,
  rawCode: string,
): Promise<RequestCodeResult> {
  const token = rawCode.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return { ok: false, message: INVALID_CODE };
  const { error } = await auth.verifyOtp({ email: normalizeEmail(rawEmail), token, type: 'email' });
  if (error) {
    if (error.status === 429) return { ok: false, message: RATE_LIMITED };
    return { ok: false, message: INVALID_CODE };
  }
  return { ok: true, message: 'Đăng nhập thành công.' };
}
