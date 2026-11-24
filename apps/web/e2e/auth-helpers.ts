import { expect, type Page, type Route } from '@playwright/test';

/** Shared by the auth E2E specs. The E2E build points Supabase at this placeholder host. */
export const AUTH = 'https://supabase-e2e.invalid/auth/v1';
export const INVALID_LOGIN = 'Email hoặc mật khẩu không đúng.';
export const PASSWORD = 'Mat-khau-thu-nghiem-E2E-42';

export type TokenRequest = { url: string; body: { email?: string; password?: string } };

/** Records every Auth call; only the password grant is allowed, everything else is a failure. */
export async function interceptAuth(page: Page, reply: (route: Route) => Promise<void>) {
  const token: TokenRequest[] = [];
  const forbidden: string[] = [];
  await page.route(`${AUTH}/**`, async (route) => {
    const url = route.request().url();
    if (url.startsWith(`${AUTH}/token?grant_type=password`)) {
      token.push({ url, body: route.request().postDataJSON() as TokenRequest['body'] });
      return reply(route);
    }
    forbidden.push(url);
    return route.fulfill({ status: 500, body: '{}' });
  });
  return { token, forbidden };
}

export const invalidCredentials = (r: Route) =>
  r.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 400,
      error_code: 'invalid_credentials',
      msg: 'Invalid login credentials',
    }),
  });

export function fakeSession() {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sub = '00000000-0000-4000-8000-000000000001';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub, exp, role: 'authenticated', aud: 'authenticated' })}.c2ln`;
  return {
    access_token: jwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'e2e-refresh-token',
    user: { id: sub, aud: 'authenticated', role: 'authenticated', email: 'duoc.cap@example.com' },
  };
}

export async function expectPasswordNotStored(page: Page) {
  const stored = await page.evaluate(() =>
    [localStorage, sessionStorage]
      .flatMap((s) => Object.keys(s).map((k) => `${k}=${s.getItem(k) ?? ''}`))
      .join('\n'),
  );
  expect(stored).not.toContain(PASSWORD);
}
