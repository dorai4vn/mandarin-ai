import { expect, test, type Page } from '@playwright/test';

/**
 * D-038 / D-037 — private app, e-mail + password sign-in for admin-created accounts, no sign-up.
 * These tests check the WEB CLIENT only: the Supabase Auth host is a placeholder
 * (`https://supabase-e2e.invalid`, set at build time) and every Auth request is intercepted, so
 * nothing here proves that a real Supabase project rejects sign-ups or wrong passwords. That is
 * covered by `scripts/test-auth-invite-only.mjs` (real GoTrue in the CI database job) and by
 * smoke tests A12–A12c on the dev project. No dev token is used in this file.
 */
import {
  INVALID_LOGIN,
  PASSWORD,
  expectPasswordNotStored,
  fakeSession,
  interceptAuth,
  invalidCredentials,
} from './auth-helpers';

const SIGN_UP_WORDING = /đăng ký|sign[\s-]?up|tạo tài khoản|create (an )?account/i;

async function submitLogin(page: Page, email: string, password = PASSWORD) {
  await page.goto('/lab/session');
  await expect(page.getByTestId('invite-only-note')).toBeVisible();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
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
