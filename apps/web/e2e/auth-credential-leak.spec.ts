import { expect, test, type Page, type Request, type TestInfo } from '@playwright/test';
import { AUTH, PASSWORD, fakeSession, interceptAuth } from './auth-helpers';

/**
 * X1 (2026-11-24): before React hydrated, the sign-in form could be submitted natively as GET,
 * putting the e-mail and password in the URL. These tests prove that credentials never reach a URL,
 * a query string, browser history or a request body through default form submission — with
 * JavaScript disabled, while hydration is still pending, and even when the inert state is tampered
 * with — and that the normal signInWithPassword flow still works once the page is ready.
 * Client-only: Supabase Auth is intercepted (placeholder host). No dev token is used.
 */
const EMAIL = 'duoc.cap@example.com';

function leaks(text: string | null | undefined) {
  if (!text) return false;
  const decoded = decodeURIComponent(text.replace(/\+/g, ' '));
  return decoded.includes(PASSWORD) || decoded.includes(EMAIL) || /password=/i.test(decoded);
}

/** Records every request the page makes so we can assert nothing carried credentials. */
function recordRequests(page: Page) {
  const all: Request[] = [];
  page.on('request', (r) => all.push(r));
  return {
    all,
    documents: () => all.filter((r) => r.resourceType() === 'document'),
    auth: () => all.filter((r) => r.url().startsWith(AUTH)),
    leaking: () => all.filter((r) => leaks(r.url()) || leaks(r.postData())),
  };
}

async function expectCleanUrl(page: Page) {
  const url = new URL(page.url());
  expect(url.pathname).toBe('/lab/session');
  expect(url.search, 'no query string from a native form submission').toBe('');
  expect(leaks(page.url())).toBe(false);
}

/** Tries every way a user could submit: mouse/touch on the button and Enter in both fields. */
async function trySubmitInert(page: Page, info: TestInfo) {
  const submit = page.getByTestId('login-submit');
  if (info.project.use.hasTouch) await submit.tap({ force: true });
  else await submit.click({ force: true });
  for (const id of ['login-email', 'login-password']) {
    await page
      .getByTestId(id)
      .focus()
      .catch(() => undefined); // disabled fields refuse focus
    await page.keyboard.press('Enter');
  }
}

async function expectInertForm(page: Page) {
  await expect(page.locator('form')).toHaveAttribute('method', 'post');
  for (const id of ['login-email', 'login-password']) {
    await expect(page.getByTestId(id)).toBeDisabled();
    await expect(page.getByTestId(id)).not.toHaveAttribute('name', /.*/);
  }
  await expect(page.getByTestId('login-submit')).toBeDisabled();
}

/** Delays the app's JavaScript so the server-rendered form is visible but not yet hydrated. */
async function holdHydration(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((r) => (release = r));
  // Only JavaScript: Turbopack also serves render-blocking CSS from /chunks/.
  await page.route(/\/_next\/static\/chunks\/.+\.js(\?.*)?$/, async (route) => {
    await released;
    await route.continue().catch(() => undefined);
  });
  return release;
}

test.describe('X1 — credentials never leave through default form submission', () => {
  test.describe('JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });

    test('form is inert, explains why, and submitting does nothing', async ({ page }, info) => {
      const req = recordRequests(page);
      await page.goto('/lab/session');
      await expectInertForm(page);
      // Playwright disables script execution but its parser still treats <noscript> as raw text, so
      // assert the message is shipped inside the form (real browsers without JS render it).
      expect(await page.content()).toMatch(
        /<noscript><p[^>]*>Cần bật JavaScript để đăng nhập\.<\/p><\/noscript>/,
      );
      await trySubmitInert(page, info);
      await page.waitForTimeout(300);
      await expectCleanUrl(page);
      expect(req.documents(), 'no navigation caused by submitting').toHaveLength(1);
      expect(req.auth()).toEqual([]);
      expect(req.leaking()).toEqual([]);
    });
  });

  test.describe('hydration still pending (slow JavaScript)', () => {
    test('nothing can be submitted and no Auth request is made', async ({ page }, info) => {
      const req = recordRequests(page);
      const release = await holdHydration(page);
      await page.goto('/lab/session', { waitUntil: 'domcontentloaded' });
      await expectInertForm(page);
      await trySubmitInert(page, info);
      await page.waitForTimeout(300);
      await expectCleanUrl(page);
      expect(req.documents()).toHaveLength(1);
      expect(req.auth(), 'no sign-in request before hydration').toEqual([]);
      expect(req.leaking()).toEqual([]);
      release();
    });

    test('even a forced native submission carries no credentials', async ({ page }) => {
      const req = recordRequests(page);
      const release = await holdHydration(page);
      await page.goto('/lab/session', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('login-password')).toBeDisabled();
      // Simulate tampering (or a future regression that drops `disabled`): enable the fields,
      // type credentials and submit the form natively, bypassing React entirely.
      const navigation = page.waitForRequest(
        (r) => r.resourceType() === 'document' && r !== req.documents()[0],
      );
      await page.evaluate(
        ([email, password]) => {
          const form = document.querySelector('form')!;
          for (const el of form.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
            'input, button',
          ))
            el.disabled = false;
          (document.querySelector('[data-testid=login-email]') as HTMLInputElement).value = email;
          (document.querySelector('[data-testid=login-password]') as HTMLInputElement).value =
            password;
          form.requestSubmit();
        },
        [EMAIL, PASSWORD] as const,
      );
      const native = await navigation;
      expect(native.method()).toBe('POST');
      expect(new URL(native.url()).search).toBe('');
      expect(leaks(native.postData()), 'fields have no name → nothing serialized').toBe(false);
      expect(req.leaking()).toEqual([]);
      expect(req.auth()).toEqual([]);
      release();
    });

    test('once hydrated, Enter / click / tap sign in normally via signInWithPassword', async ({
      page,
    }, info) => {
      const req = recordRequests(page);
      const { token, forbidden } = await interceptAuth(page, (r) =>
        r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fakeSession()),
        }),
      );
      const release = await holdHydration(page);
      await page.goto('/lab/session', { waitUntil: 'domcontentloaded' });
      await trySubmitInert(page, info);
      expect(token, 'nothing sent while inert').toHaveLength(0);
      release();
      await expect(page.getByTestId('login-password')).toBeEnabled();
      await page.getByTestId('login-email').fill(EMAIL);
      await page.getByTestId('login-password').fill(PASSWORD);
      // Alternate the submit gesture by project so all three are covered across the matrix.
      const gesture = info.project.use.hasTouch
        ? 'tap'
        : info.project.name.endsWith('desktop')
          ? 'enter'
          : 'click';
      if (gesture === 'tap') await page.getByTestId('login-submit').tap();
      else if (gesture === 'click') await page.getByTestId('login-submit').click();
      else await page.getByTestId('login-password').press('Enter');
      await expect(page.getByTestId('login-signed-in')).toBeVisible();
      expect(token).toHaveLength(1);
      expect(token[0]?.body).toMatchObject({ email: EMAIL, password: PASSWORD });
      expect(forbidden).toEqual([]);
      await expectCleanUrl(page);
      // The only request carrying the password is the HTTPS password grant body to Supabase Auth.
      const leaking = req.leaking().filter((r) => !r.url().startsWith(`${AUTH}/token`));
      expect(leaking).toEqual([]);
      expect(req.documents()).toHaveLength(1);
    });

    test('Enter in the password field submits once the page is ready (keyboard UX)', async ({
      page,
    }) => {
      const { token } = await interceptAuth(page, (r) =>
        r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fakeSession()),
        }),
      );
      await page.goto('/lab/session');
      await page.getByTestId('login-email').fill(EMAIL);
      await page.getByTestId('login-password').fill(PASSWORD);
      await page.getByTestId('login-password').press('Enter');
      await expect(page.getByTestId('login-signed-in')).toBeVisible();
      expect(token).toHaveLength(1);
      await expectCleanUrl(page);
    });
  });
});
