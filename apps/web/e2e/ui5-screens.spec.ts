import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

/**
 * UI-5 learning screens on V2 (SCREEN_BLUEPRINTS_V2 §2–5, §7): honest M0 content — no streak,
 * XP, due counts or sample words presented as real; unbuilt features are "Sắp có" / "Ra mắt ở Mx"
 * and are not clickable; "Thư viện" stays a library (not lessons).
 */
const ROUTES = [
  '/',
  '/practice',
  '/dictionary',
  '/library',
  '/profile',
  '/lab/session',
  '/lab/upload',
  '/lab/handwriting',
  '/lab/audio',
];

test('learning screens: no serious/critical axe violations, no horizontal scroll', async ({
  page,
}) => {
  for (const path of ROUTES) {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveCount(1);
    // Hydrated and settled: controls enabled on hydration fade their colours in (transitions),
    // and a contrast check taken mid-transition reads an in-between colour.
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
    );
    if (path === '/lab/session') await expect(page.getByTestId('login-email')).toBeEnabled();
    await page.waitForFunction(() =>
      document.getAnimations().every((a) => !(a instanceof CSSTransition)),
    );
    const r = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${path} ${v.id} ${v.nodes.map((n) => n.html).join(' | ')}`)).toEqual([]);
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

test('login form (V2 fields): labels, password hidden again and focused after a failed attempt', async ({
  page,
}) => {
  const { interceptAuth, invalidCredentials } = await import('./auth-helpers');
  await interceptAuth(page, invalidCredentials);
  await page.goto('/lab/session');
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
    'autocomplete',
    'username',
  );
  const pw = page.getByLabel('Mật khẩu', { exact: true });
  await expect(pw).toHaveAttribute('autocomplete', 'current-password');
  await expect(page.getByTestId('login-email')).toBeEnabled();
  await page.getByTestId('login-email').fill('duoc.cap@example.com');
  await pw.fill('mat-khau-sai-1234');
  const reveal = page.getByRole('button', { name: 'Hiện mật khẩu' }).first();
  await reveal.click();
  await expect(pw).toHaveAttribute('type', 'text');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-message')).toBeVisible();
  await expect(pw).toHaveAttribute('type', 'password');
  await expect(reveal).toHaveAttribute('aria-pressed', 'false');
  await expect(pw).toBeFocused();
  await expect(pw).toHaveValue('');
  await expectNoHorizontalScroll(page);
});

test('upload (V2 §21): file row with status, rejection, offline disables the picker', async ({
  page,
  context,
}) => {
  const { signIn, SAMPLE_PDF } = await import('./helpers');
  await signIn(page);
  await page.goto('/lab/upload');
  const input = page.getByTestId('pdf-input');
  await expect(input).toBeEnabled();
  await input.setInputFiles({
    name: 'sai.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('<html>'),
  });
  const row = page.getByTestId('upload-file');
  await expect(row).toHaveAttribute('data-phase', 'error');
  await expect(row).toContainText('sai.pdf');
  await expect(row).toContainText('Lỗi');
  await expect(page.getByRole('status')).toContainText('Tệp không phải PDF');
  await input.setInputFiles({
    name: 'bai-mau.pdf',
    mimeType: 'application/pdf',
    buffer: SAMPLE_PDF,
  });
  await expect(row).toHaveAttribute('data-phase', 'saved');
  await expect(row).toContainText('Đã lưu');
  // Keyboard reachable: the (visually hidden) file input takes focus inside the drop zone.
  await input.focus();
  await expect(input).toBeFocused();
  await context.setOffline(true);
  await expect(input).toBeDisabled();
  await expect(page.getByTestId('upload-offline')).toBeVisible();
  await context.setOffline(false);
  await expect(input).toBeEnabled();
  await expectNoHorizontalScroll(page);
});

test('handwriting (V2 §23): frame size per device, labelled toolbar, stroke count in the label', async ({
  page,
}) => {
  const { SHAN, deviceClass, drawStrokes, signIn } = await import('./helpers');
  await signIn(page);
  await page.goto('/lab/handwriting');
  const canvas = page.getByTestId('handwriting-canvas');
  await expect(canvas).toHaveAttribute('aria-label', 'Khung viết chữ Hán — 0 nét');
  const w = (await canvas.boundingBox())!.width;
  const max = { phone: 360, tablet: 420, desktop: 480 }[deviceClass(page)];
  expect(w).toBeLessThanOrEqual(max + 0.5);
  const toolbar = page.getByRole('toolbar', { name: 'Công cụ viết' });
  for (const name of ['Hoàn tác nét', 'Xóa', 'Nộp bài'])
    await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
  await drawStrokes(page, SHAN, 'touch');
  await expect(canvas).toHaveAttribute('aria-label', `Khung viết chữ Hán — ${SHAN.length} nét`);
  await toolbar.getByRole('button', { name: 'Hoàn tác nét' }).click();
  await expect(canvas).toHaveAttribute('aria-label', `Khung viết chữ Hán — ${SHAN.length - 1} nét`);
  await expectNoHorizontalScroll(page);
});

test('audio (V2 §22): 64 px record button named by state, playback speed as a radio group', async ({
  page,
}) => {
  await page.goto('/lab/audio');
  const rec = page.getByTestId('rec-start');
  await expect(rec).toHaveAccessibleName('Bắt đầu ghi');
  const box = (await rec.boundingBox())!;
  expect(Math.round(box.width)).toBe(64);
  expect(Math.round(box.height)).toBe(64);
  const speed = page.getByRole('group', { name: 'Tốc độ nghe lại' });
  await expect(speed.getByRole('radio', { name: '1×' })).toBeChecked();
  await speed.getByText('0.75×').click();
  await expect(speed.getByRole('radio', { name: '0.75×' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Nghe lại' })).toBeDisabled();
});
