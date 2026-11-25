import { expect, test, type Page } from '@playwright/test';
import { AUTH, PASSWORD, fakeSession } from './auth-helpers';
import { signIn } from './helpers';

/**
 * M1 (D-042): standard Supabase Auth in the web app — sign-in page, protected personal data,
 * sign-out that deletes the account's local database, no data shared between accounts, and the
 * same account seeing the same data on two devices (pull sync).
 * The Supabase host is a placeholder: Auth calls are intercepted (real GoTrue is tested in CI by
 * scripts/test-auth-invite-only.mjs and scripts/test-data-isolation.mjs).
 */
const SUB = fakeSession().user.id;
const DB = (sub: string) => `mandarin-ai:${sub}`;

const dbNames = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ''));
const authKeys = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => /^sb-.*-auth-token/.test(k)));

async function fakeSupabase(page: Page) {
  const calls: string[] = [];
  await page.route(`${AUTH}/**`, async (route) => {
    const url = route.request().url();
    calls.push(new URL(url).pathname);
    if (url.includes('/token?grant_type=password'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession()),
      });
    if (url.includes('/logout')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  return calls;
}

async function addNote(page: Page, text: string) {
  await expect(page.getByTestId('note-input')).toBeEnabled();
  await page.getByTestId('note-input').fill(text);
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('note-list')).toContainText(text);
}

test('signed out: no personal data is opened, sync is not attempted, sign-in is offered', async ({
  page,
}) => {
  const syncCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/v1/sync/')) syncCalls.push(r.url());
  });
  // D-032 / G2: signed-out visitors never download the Supabase SDK.
  const sdkScripts: string[] = [];
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    const body = await r.text().catch(() => '');
    if (body.includes('GoTrueClient')) sdkScripts.push(r.url());
  });
  await page.goto('/lab/offline');
  await expect(page.getByTestId('require-auth')).toBeVisible();
  await expect(page.getByTestId('note-input')).toHaveCount(0);
  const login = page.getByTestId('require-auth').getByRole('link', { name: 'Đăng nhập' });
  await expect(login).toHaveAttribute('href', '/login?next=%2Flab%2Foffline');

  const chip = page.getByTestId('sync-chip').filter({ visible: true }).first();
  await expect(chip).toHaveAttribute('data-sync-state', 'signed-out');
  await expect(chip).toContainText('Chưa đăng nhập');
  await chip.click();
  await expect(page.getByTestId('sync-popover-login').filter({ visible: true })).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('home-sync-signed-out')).toBeVisible();
  expect((await dbNames(page)).filter((n) => n.startsWith('mandarin-ai'))).toEqual([]);
  expect(syncCalls).toEqual([]);
  expect(sdkScripts, 'Supabase SDK loaded for a signed-out visitor').toEqual([]);
});

test('sign-in page: e-mail + password, then back to the requested page; unsafe "next" ignored', async ({
  page,
}) => {
  await fakeSupabase(page);
  await page.goto('/login?next=/lab/offline');
  await page.getByTestId('login-email').fill('duoc.cap@example.com');
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/lab\/offline$/);
  await expect(page.getByTestId('require-auth')).toHaveCount(0);
  await expect(page.getByTestId('note-input')).toBeVisible();
  expect(await dbNames(page)).toContain(DB(SUB));
  // The session survives a reload (official supabase-js persistence).
  await page.reload();
  await expect(page.getByTestId('note-input')).toBeVisible();

  // Already signed in: /login says so instead of showing the form.
  await page.goto('/login?next=//evil.example.com');
  await expect(page.getByTestId('login-already')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tiếp tục' })).toHaveAttribute('href', '/');
});

test('sign-out: warns about unsent changes, deletes the local database and the session', async ({
  page,
}) => {
  const calls = await fakeSupabase(page);
  await page.goto('/login?next=/lab/offline');
  await page.getByTestId('login-email').fill('duoc.cap@example.com');
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/lab\/offline$/);
  // The placeholder project's token is not accepted by the API, so this note stays unsent.
  await addNote(page, 'chưa gửi được');

  await page.goto('/profile');
  await expect(page.getByTestId('account-email')).toHaveText('duoc.cap@example.com');
  await page.getByTestId('sign-out').click();
  const dialog = page.getByTestId('sign-out-confirm');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Còn 1 thay đổi chưa gửi');
  await page.getByTestId('sign-out-discard').click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-email')).toBeVisible();
  expect(await dbNames(page)).not.toContain(DB(SUB));
  expect(await authKeys(page)).toEqual([]);
  expect(calls).toContain('/auth/v1/logout');
  await page.goto('/lab/offline');
  await expect(page.getByTestId('require-auth')).toBeVisible();
});

test("switching accounts never shows the previous account's data", async ({ browser }) => {
  const context = await browser.newContext();
  const a = crypto.randomUUID();
  const b = crypto.randomUUID();
  const pageA = await context.newPage();
  await signIn(pageA, a);
  await pageA.goto('/lab/offline');
  await addNote(pageA, 'ghi chú của A');
  await pageA.close();

  // Same browser profile, another account (A never signed out: its database still exists).
  const pageB = await context.newPage();
  await signIn(pageB, b);
  await pageB.goto('/lab/offline');
  await expect(pageB.getByTestId('note-input')).toBeEnabled();
  await expect(pageB.getByTestId('offline-status')).toContainText('chờ=0');
  await expect(pageB.getByTestId('note-list')).not.toContainText('ghi chú của A');
  const names = await dbNames(pageB);
  expect(names).toContain(DB(a));
  expect(names).toContain(DB(b));
  await context.close();
});

test('the same account sees the same data on two devices; another account does not', async ({
  browser,
}) => {
  const user = crypto.randomUUID();
  const desktop = await browser.newContext(); // device 1
  const phone = await browser.newContext(); // device 2: separate storage
  const other = await browser.newContext();
  const p1 = await desktop.newPage();
  await signIn(p1, user);
  await p1.goto('/lab/offline');
  await addNote(p1, '山 = núi (máy tính)');
  await expect(p1.getByTestId('offline-status')).toContainText('chờ=0'); // pushed

  const p2 = await phone.newPage();
  await signIn(p2, user);
  await p2.goto('/lab/offline');
  await expect(p2.getByTestId('note-list')).toContainText('山 = núi (máy tính)'); // pulled
  await addNote(p2, '水 = nước (điện thoại)');
  await expect(p2.getByTestId('offline-status')).toContainText('chờ=0');

  await p1.getByTestId('sync-now').click();
  await expect(p1.getByTestId('note-list')).toContainText('水 = nước (điện thoại)');
  // Exactly once: each note appears once on each device.
  for (const p of [p1, p2]) expect(await p.getByTestId('note-list').locator('li').count()).toBe(2);

  const p3 = await other.newPage();
  await signIn(p3, crypto.randomUUID());
  await p3.goto('/lab/offline');
  await expect(p3.getByTestId('note-input')).toBeEnabled();
  await p3.getByTestId('sync-now').click();
  await expect(p3.getByTestId('note-list')).not.toContainText('núi');
  for (const c of [desktop, phone, other]) await c.close();
});
