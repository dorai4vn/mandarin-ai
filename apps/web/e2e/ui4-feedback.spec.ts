import { expect, test, type Page } from '@playwright/test';
import { deviceClass, expectNoHorizontalScroll } from './helpers';

/**
 * UI-4 feedback (COMPONENT_SPEC_V2 §14, §15, §19, §20): Sync Indicator popover, Offline banner,
 * Toast (live region, no focus steal, auto-hide, pause, max 3), Dialog (focus, Esc, scrim).
 */
async function hydrated(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}
const chip = (page: Page) => page.getByTestId('sync-chip').filter({ visible: true }).first();

test('sync indicator: popover with details; Esc and outside click close it', async ({ page }) => {
  await hydrated(page);
  const c = chip(page);
  await expect(c).toHaveAttribute('aria-expanded', 'false');
  await c.click();
  await expect(c).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator(`[id="${(await c.getAttribute('aria-controls'))!}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'dialog');
  for (const t of ['Mạng', 'Chờ gửi', 'Lỗi', 'Lần cuối'])
    await expect(panel.getByText(t, { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Đồng bộ ngay', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(c).toBeFocused();
  await c.click();
  await expect(panel).toBeVisible();
  // Outside click: the page gutter (the popover may cover the heading on phones).
  await page.mouse.click(4, (page.viewportSize()?.height ?? 800) / 2);
  await expect(panel).toBeHidden();
  await expectNoHorizontalScroll(page);
});

test('sync indicator: "Đồng bộ ngay" reports the result in a toast without moving focus', async ({
  page,
}) => {
  await hydrated(page);
  const c = chip(page);
  await c.click();
  const now = page.getByTestId('sync-popover-now').filter({ visible: true });
  await now.click();
  const toast = page.getByTestId('toast').first();
  await expect(toast).toBeVisible();
  await expect(page.getByTestId('toast-region')).toContainText(/đồng bộ|gửi|thiết bị/i);
  await expect(toast).not.toBeFocused();
});

test('collapsed sidebar shows the sync status as a dot; text stays accessible', async ({
  page,
}) => {
  const cls = deviceClass(page);
  test.skip(cls !== 'tablet', 'rail only');
  await hydrated(page);
  const c = page.getByTestId('nav-rail').getByTestId('sync-chip').filter({ visible: true });
  const box = (await c.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(32);
  await expect(c).toHaveAccessibleName(/đồng bộ|Offline|thiết bị/i);
  // The popover opens beside the rail and is not clipped by it.
  await c.click();
  const panel = page.locator(`[id="${(await c.getAttribute('aria-controls'))!}"]`);
  await expect(panel).toBeVisible();
  const p = (await panel.boundingBox())!;
  expect(p.x).toBeGreaterThanOrEqual(box.x + box.width);
  const hit = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.right - 10, r.top + 10));
  });
  expect(hit).toBe(true);
});

test('offline banner appears when offline, can be collapsed, returns next time', async ({
  page,
  context,
}) => {
  await hydrated(page);
  const banner = page.getByTestId('offline-banner');
  await expect(banner).toHaveCount(0);
  await context.setOffline(true);
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('role', 'status');
  await expect(banner).toContainText('Đang offline');
  await expect(chip(page)).toContainText('Offline');
  await banner.getByRole('button', { name: 'Thu gọn thông báo offline' }).click();
  await expect(banner).toHaveCount(0);
  await expect(chip(page)).toContainText('Offline'); // still visible in the indicator
  await context.setOffline(false);
  await expect(chip(page)).not.toContainText('Offline');
  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toBeVisible();
  await context.setOffline(false);
  await expectNoHorizontalScroll(page);
});

test('toast: polite live region, no focus steal, auto-hides, pauses on hover, max 3', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const trigger = page.getByTestId('toast-neutral');
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await trigger.click();
  const region = page.getByTestId('toast-live-polite');
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await expect(region.getByTestId('toast')).toHaveCount(1);
  await expect(trigger).toBeFocused();
  // Auto-hide after ~4 s.
  await expect(region.getByTestId('toast')).toHaveCount(0, { timeout: 7000 });

  // Max 3 stacked.
  for (let i = 0; i < 4; i++) await trigger.click();
  await expect(page.getByTestId('toast')).toHaveCount(3);
  // Close button.
  await page.getByRole('button', { name: 'Đóng thông báo' }).first().click();
  await expect(page.getByTestId('toast')).toHaveCount(2);

  // Errors go to the assertive region.
  await page.getByTestId('toast-error').click();
  await expect(page.getByTestId('toast-live-assertive').getByTestId('toast')).toHaveCount(1);
  await expect(page.getByTestId('toast-live-assertive')).toHaveAttribute('aria-live', 'assertive');
});

test('toast: hover keeps it open past its timeout', async ({ page }) => {
  const hover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  test.skip(!hover, 'hover devices only');
  await hydrated(page, '/lab/design');
  await page.getByTestId('toast-neutral').click();
  const t = page.getByTestId('toast').first();
  await t.hover();
  await page.waitForTimeout(5000);
  await expect(t).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByTestId('toast')).toHaveCount(0, { timeout: 7000 });
});

test('toast with an action: "Hoàn tác" runs and dismisses', async ({ page }) => {
  await hydrated(page, '/lab/design');
  const count = page.getByTestId('dialog-deleted');
  await expect(count).toHaveText('Đã xóa: 0');
  await page.getByTestId('toast-success').click();
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await expect(count).toHaveText('Đã xóa: -1');
  await expect(page.getByTestId('toast')).toHaveCount(0);
});

test('dialog: focus first action, Esc closes and returns focus, confirm acts', async ({ page }) => {
  await hydrated(page, '/lab/design');
  const open = page.getByTestId('dialog-open');
  await open.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await open.click();
  const dialog = page.getByTestId('dialog-confirm');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('Xóa tài liệu?');
  await expect(dialog).toHaveAccessibleDescription(/không hoàn tác được/i);
  await expect(page.getByTestId('dialog-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await open.click();
  await page.getByTestId('dialog-confirm-delete').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('dialog-deleted')).toHaveText('Đã xóa: 1');
});

test('dialog with unsaved input: a backdrop click does not close it; Esc does', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const open = page.getByTestId('dialog-draft-open');
  await open.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await open.click();
  const dialog = page.getByTestId('dialog-draft');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toBeFocused();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
