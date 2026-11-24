import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * D-037 — private app, invite only. These tests check the WEB CLIENT behaviour only:
 * the Supabase Auth endpoint is intercepted (the E2E build points at a placeholder
 * `https://supabase-e2e.invalid`), so nothing here proves a real Supabase project rejects
 * sign-ups. That is covered by `scripts/test-auth-invite-only.mjs` (real GoTrue in CI) and
 * by smoke test A12a/A12b on the dev project. No dev token is used in this file.
 */
const SUPABASE_E2E_HOST = 'supabase-e2e.invalid';
const NEUTRAL = /Nếu email này đã được quản trị viên cấp quyền/;
const SIGN_UP_WORDING = /đăng ký|sign[\s-]?up|tạo tài khoản|create (an )?account/i;

type OtpBody = { email?: string; create_user?: boolean };

async function interceptOtp(page: Page, reply: (route: Route) => Promise<void>) {
  const bodies: OtpBody[] = [];
  await page.route(`https://${SUPABASE_E2E_HOST}/auth/v1/otp**`, async (route) => {
    bodies.push(route.request().postDataJSON() as OtpBody);
    await reply(route);
  });
  // Any other Auth endpoint (signup, anonymous sign-in) must never be called by the page.
  const forbidden: string[] = [];
  await page.route(`https://${SUPABASE_E2E_HOST}/auth/v1/signup**`, async (route) => {
    forbidden.push(route.request().url());
    await route.fulfill({ status: 500, body: '{}' });
  });
  return { bodies, forbidden };
}

async function requestCode(page: Page, email: string) {
  await page.goto('/lab/session');
  await expect(page.getByTestId('invite-only-note')).toBeVisible();
  await page.getByTestId('otp-email').fill(email);
  await page.getByTestId('otp-submit').click();
  return page.getByTestId('otp-message');
}

test.describe('Invite-only sign-in (D-037)', () => {
  test('OTP request never asks Supabase to create a user (invited e-mail)', async ({ page }) => {
    const { bodies, forbidden } = await interceptOtp(page, (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    const msg = await requestCode(page, 'duoc.moi@example.com');
    await expect(msg).toHaveText(NEUTRAL);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.email).toBe('duoc.moi@example.com');
    expect(bodies[0]?.create_user).toBe(false);
    expect(forbidden).toEqual([]);
  });

  test('unknown e-mail gets the same neutral message (no account enumeration)', async ({
    page,
  }) => {
    const { bodies, forbidden } = await interceptOtp(page, (r) =>
      r.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 422,
          error_code: 'otp_disabled',
          msg: 'Signups not allowed for otp',
        }),
      }),
    );
    const msg = await requestCode(page, 'nguoi.la@example.com');
    await expect(msg).toHaveText(NEUTRAL);
    await expect(page.getByText(/Signups not allowed/i)).toHaveCount(0);
    expect(bodies[0]?.create_user).toBe(false);
    expect(forbidden).toEqual([]);
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
