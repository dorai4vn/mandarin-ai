import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * D-038 / D-037 — private app, e-mail + password sign-in for admin-created accounts, no sign-up.
 * These tests check the WEB CLIENT only: the Supabase Auth host is a placeholder
 * (`https://supabase-e2e.invalid`, set at build time) and every Auth request is intercepted, so
 * nothing here proves that a real Supabase project rejects sign-ups or wrong passwords. That is
 * covered by `scripts/test-auth-invite-only.mjs` (real GoTrue in the CI database job) and by
 * smoke tests A12–A12c on the dev project. No dev token is used in this file.
 */
const AUTH = 'https://supabase-e2e.invalid/auth/v1';
const INVALID_LOGIN = 'Email hoặc mật khẩu không đúng.';
const SIGN_UP_WORDING = /đăng ký|sign[\s-]?up|tạo tài khoản|create (an )?account/i;
const PASSWORD = 'Mat-khau-thu-nghiem-E2E-42';

type TokenRequest = { url: string; body: { email?: string; password?: string } };

/** Records every Auth call; only the password grant is allowed, everything else is a failure. */
async function interceptAuth(page: Page, reply: (route: Route) => Promise<void>) {
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

const invalidCredentials = (r: Route) =>
  r.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 400,
      error_code: 'invalid_credentials',
      msg: 'Invalid login credentials',
    }),
  });

function fakeSession() {
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

async function submitLogin(page: Page, email: string, password = PASSWORD) {
  await page.goto('/lab/session');
  await expect(page.getByTestId('invite-only-note')).toBeVisible();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

async function expectPasswordNotStored(page: Page) {
  const stored = await page.evaluate(() =>
    [localStorage, sessionStorage]
      .flatMap((s) => Object.keys(s).map((k) => `${k}=${s.getItem(k) ?? ''}`))
      .join('\n'),
  );
  expect(stored).not.toContain(PASSWORD);
}

test.describe('E-mail + password sign-in, invite only (D-038)', () => {
  test('signs in with signInWithPassword only — no sign-up, no e-mail code', async ({ page }) => {
    const { token, forbidden } = await interceptAuth(page, (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession()),
      }),
    );
    await submitLogin(page, ' Duoc.Cap@Example.com ');
    await expect(page.getByTestId('login-signed-in')).toBeVisible();
    expect(token).toHaveLength(1);
    expect(token[0]?.body.email).toBe('duoc.cap@example.com');
    expect(token[0]?.body.password).toBe(PASSWORD);
    expect(forbidden, 'no /signup, /otp or other Auth endpoint').toEqual([]);
    await expectPasswordNotStored(page);
  });

  test('wrong password and unknown e-mail show the same generic message', async ({ page }) => {
    const { token, forbidden } = await interceptAuth(page, invalidCredentials);
    await submitLogin(page, 'duoc.cap@example.com', 'mat-khau-sai-1234');
    await expect(page.getByTestId('login-message')).toHaveText(INVALID_LOGIN);
    await expect(page.getByTestId('login-password')).toHaveValue('');
    await submitLogin(page, 'nguoi.la@example.com');
    await expect(page.getByTestId('login-message')).toHaveText(INVALID_LOGIN);
    await expect(page.getByText(/Invalid login credentials/i)).toHaveCount(0);
    expect(token).toHaveLength(2);
    expect(forbidden).toEqual([]);
    await expect(page.getByTestId('login-signed-in')).toHaveCount(0);
    await expectPasswordNotStored(page);
  });

  test('no page offers sign-up, and sign-up routes do not exist', async ({ page }) => {
    for (const path of [
      '/',
      '/dictionary',
      '/library',
      '/practice',
      '/profile',
      '/lab',
      '/lab/session',
    ]) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      const text = await page.locator('body').innerText();
      expect(text, `${path} must not advertise sign-up`).not.toMatch(SIGN_UP_WORDING);
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs.filter((h) => /sign-?up|register|dang-ky/i.test(h))).toEqual([]);
    }
    for (const path of ['/signup', '/sign-up', '/register', '/dang-ky', '/auth/signup']) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });
});
