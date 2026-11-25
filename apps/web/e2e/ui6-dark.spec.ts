import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, signIn } from './helpers';

/**
 * UI-6 Dark mode (TOKENS_V2 §2, §7): follows the system by default; Sáng / Tối / Theo hệ thống in
 * Hồ sơ & cài đặt, remembered per device, applied before first paint (no flash); AA contrast in
 * dark on the real screens.
 */
const DARK_BG = 'rgb(14, 20, 34)';
const LIGHT_BG = 'rgb(247, 249, 253)';
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
async function hydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}

test('follows the system colour scheme by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await bodyBg(page)).toBe(DARK_BG);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await bodyBg(page)).toBe(LIGHT_BG);
});

test('picker: Tối / Sáng / Theo hệ thống, remembered, applied before first paint', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await hydrated(page, '/profile');
  const picker = page.getByTestId('theme-picker');
  await expect(picker.getByRole('radio', { name: 'Theo hệ thống' })).toBeChecked();
  await picker.getByText('Tối', { exact: true }).click();
  await expect(picker.getByRole('radio', { name: 'Tối' })).toBeChecked();
  expect(await bodyBg(page)).toBe(DARK_BG);
  expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBe('dark');
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
        (m) => m.content,
      ),
    ),
  ).toEqual(['#0e1422', '#0e1422']);

  // No flash: with JavaScript chunks blocked, the inline script alone applies the choice.
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await page.unroute(/\/_next\/static\/chunks\/.*\.js/);

  // Light under a dark system.
  await page.emulateMedia({ colorScheme: 'dark' });
  await hydrated(page, '/profile');
  await page.getByTestId('theme-picker').getByText('Sáng', { exact: true }).click();
  expect(await bodyBg(page)).toBe(LIGHT_BG);

  // Back to the system: the stored choice is removed.
  await page.getByTestId('theme-picker').getByText('Theo hệ thống', { exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBeNull();
  expect(await bodyBg(page)).toBe(DARK_BG);
});

test('picker works when storage is unavailable (falls back to this page only)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await hydrated(page, '/profile');
  await page.getByTestId('theme-picker').getByText('Tối', { exact: true }).click();
  expect(await bodyBg(page)).toBe(DARK_BG);
  expect(errors).toEqual([]);
});

test('dark: no serious/critical axe violations on the main screens', async ({ page }) => {
  test.slow();
  await signIn(page); // personal-data screens render their real content
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const path of [
    '/',
    '/practice',
    '/dictionary',
    '/library',
    '/profile',
    '/lab',
    '/lab/session',
    '/lab/upload',
    '/lab/handwriting',
    '/lab/audio',
    '/lab/offline',
    '/lab/design',
  ]) {
    await hydrated(page, path);
    // Controls enabled asynchronously (hydration, IndexedDB open) must be settled before a
    // contrast scan, or axe reads a colour mid-transition from the disabled style.
    const READY: Record<string, string> = {
      '/lab/session': 'login-email',
      '/lab/offline': 'note-add',
      '/lab/upload': 'pdf-input',
    };
    if (READY[path]) await expect(page.getByTestId(READY[path]!)).toBeEnabled();
    await page.waitForFunction(() =>
      document.getAnimations().every((a) => !(a instanceof CSSTransition)),
    );
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      bad.map((v) => `${path} ${v.id} ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`),
    ).toEqual([]);
    await expectNoHorizontalScroll(page);
  }
});
