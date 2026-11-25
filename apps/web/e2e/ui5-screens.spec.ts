import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

/**
 * UI-5 learning screens on V2 (SCREEN_BLUEPRINTS_V2 §2–5, §7): honest M0 content — no streak,
 * XP, due counts or sample words presented as real; unbuilt features are "Sắp có" / "Ra mắt ở Mx"
 * and are not clickable; "Thư viện" stays a library (not lessons).
 */
const ROUTES = ['/', '/practice', '/dictionary', '/library', '/profile'];

test('learning screens: no serious/critical axe violations, no horizontal scroll', async ({
  page,
}) => {
  for (const path of ROUTES) {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveCount(1);
    const r = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${path} ${v.id}`)).toEqual([]);
    await expectNoHorizontalScroll(page);
  }
});

test('home: no fake metrics; study tiles are "Sắp có" and not links; sync card is real', async ({
  page,
}) => {
  await page.goto('/');
  const main = page.locator('main');
  for (const fake of [/chuỗi\s*\d/i, /\d+\s*ngày/i, /\bXP\b/, /Lv\.?\s*\d/i, /\d+\s*thẻ đến hạn/i])
    await expect(main).not.toContainText(fake);
  await expect(page.getByTestId('home-today')).toContainText('Ra mắt ở M3');
  const tiles = page.getByTestId('home-study').locator('> *');
  await expect(tiles).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(tiles.nth(i)).toContainText('Sắp có');
    expect(await tiles.nth(i).evaluate((el) => el.tagName)).toBe('DIV');
    await expect(tiles.nth(i)).toHaveAttribute('data-state', 'coming-soon');
  }
  // Study tile colours: Blue / Lavender / Mint (approved).
  const bgs = await tiles.evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(bgs).toEqual(['rgb(226, 237, 253)', 'rgb(240, 234, 254)', 'rgb(212, 248, 240)']);
  await expect(page.getByTestId('store-kind')).not.toHaveText('');
});

test('dictionary: no sample words; coming-soon with milestones', async ({ page }) => {
  await page.goto('/dictionary');
  const main = page.locator('main');
  for (const sample of ['shān', 'shuǐ', 'rén']) await expect(main).not.toContainText(sample);
  await expect(page.getByTestId('dictionary-empty')).toContainText('Ra mắt ở M2');
  await expect(main.locator('input')).toHaveCount(0); // no non-functional search box
});

test('library: tabs Giáo trình / Tài liệu của tôi, both honest', async ({ page }) => {
  await page.goto('/library');
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
  const tabs = page.getByTestId('library-tabs').getByRole('tab');
  await expect(tabs).toHaveText(['Giáo trình', 'Tài liệu của tôi']);
  await expect(page.getByRole('tabpanel')).toContainText('Ra mắt ở M2');
  await tabs.nth(1).click();
  await expect(page.getByRole('tabpanel')).toContainText('Ra mắt ở M4');
  await expect(
    page.getByRole('tabpanel').getByRole('link', { name: /Thử tải PDF/ }),
  ).toHaveAttribute('href', '/lab/upload');
  await expect(page.locator('main')).not.toContainText('Học bài');
});

test('practice: six modes with milestones; no simulated quiz', async ({ page }) => {
  await page.goto('/practice');
  const modes = page.getByTestId('practice-modes').locator('> li');
  await expect(modes).toHaveCount(6);
  for (let i = 0; i < 6; i++) await expect(modes.nth(i)).toContainText(/Ra mắt ở M[356]/);
  await expect(page.locator('main button')).toHaveCount(0);
});

test('profile: account copy matches D-038 (e-mail + password, no OTP)', async ({ page }) => {
  await page.goto('/profile');
  const main = page.locator('main');
  await expect(main).toContainText('email và mật khẩu do quản trị viên cấp');
  await expect(main).not.toContainText('OTP');
});
