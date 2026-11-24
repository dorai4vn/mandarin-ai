/**
 * Sign-in with e-mail + password for accounts created by an administrator (D-038, D-037).
 * There is NO sign-up and no e-mail code: the only call is `signInWithPassword`.
 * Every failure that could reveal whether an account exists (wrong password, unknown e-mail,
 * unconfirmed/banned account) produces the same message (no account enumeration).
 * The password is passed straight to Supabase Auth over HTTPS and is never stored or logged.
 */
export interface PasswordAuthClient {
  signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ error: { status?: number; code?: string; message: string } | null }>;
}

export const INVALID_LOGIN = 'Email hoặc mật khẩu không đúng.';
export const RATE_LIMITED = 'Bạn đã thử đăng nhập quá nhiều lần. Hãy đợi vài phút rồi thử lại.';
export const INVALID_EMAIL = 'Email không hợp lệ.';
export const MISSING_PASSWORD = 'Hãy nhập mật khẩu.';
export const UNAVAILABLE = 'Không kết nối được máy chủ đăng nhập. Hãy thử lại sau.';
export const SIGNED_IN = 'Đăng nhập thành công.';
/** D-038: passwords set by the administrator or the user must be at least 12 characters. */
export const MIN_PASSWORD_LENGTH = 12;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type SignInResult = { ok: boolean; message: string };

export async function signInWithEmailPassword(
  auth: PasswordAuthClient,
  rawEmail: string,
  password: string,
): Promise<SignInResult> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL.test(email)) return { ok: false, message: INVALID_EMAIL };
  // No minimum-length check here: the policy applies when a password is SET (Supabase enforces
  // it); refusing short input at login would only tell an attacker about the policy.
  if (!password) return { ok: false, message: MISSING_PASSWORD };
  let error: { status?: number; code?: string; message: string } | null;
  try {
    ({ error } = await auth.signInWithPassword({ email, password }));
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
  if (!error) return { ok: true, message: SIGNED_IN };
  if (error.status === 429 || /rate_limit/i.test(error.code ?? '')) {
    return { ok: false, message: RATE_LIMITED };
  }
  if (error.status !== undefined && error.status >= 500) return { ok: false, message: UNAVAILABLE };
  // invalid_credentials, email_not_confirmed, user_banned, … all look the same.
  return { ok: false, message: INVALID_LOGIN };
}
