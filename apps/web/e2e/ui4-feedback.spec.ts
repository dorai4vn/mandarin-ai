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
  for (const t of ['Mạng', 'Chờ gửi', 'Lỗi', 'Lần thử cuối'])
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
  await expect(page.getByTestId('toast').first()).toBeVisible();
  // Empty outbox: never "Đã đồng bộ …" (G1) — nothing was synced by this click.
  await expect(page.getByTestId('toast-region')).toHaveText('Không có thay đổi nào cần đồng bộ.');
  await expect(now).toBeFocused();
  expect(
    await page.evaluate(() =>
      document.querySelector('[data-testid="toast-region"]')!.contains(document.activeElement),
    ),
  ).toBe(false);
});

test('sync indicator: with cloud sync disabled, "Đồng bộ ngay" says data stays on the device', async ({
  page,
}) => {
  await page.route('**/health', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.providers.sync = 'disabled';
    await route.fulfill({ response, json });
  });
  await hydrated(page);
  const c = chip(page);
  await expect(c).toHaveAttribute('data-sync-state', 'local-only');
  await c.click();
  await page.getByTestId('sync-popover-now').filter({ visible: true }).click();
  await expect(page.getByTestId('toast-region')).toHaveText(
    'Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt.',
  );
  await expect(page.getByTestId('toast-region')).not.toContainText('Đã đồng bộ');
});

test('sync indicator: the expanded desktop sidebar does not clip the popover', async ({ page }) => {
  test.skip(deviceClass(page) !== 'desktop', 'expanded sidebar (≥ 1280 px)');
  await hydrated(page);
  const c = page.getByTestId('nav-sidebar').getByTestId('sync-chip').filter({ visible: true });
  await c.click();
  const panel = page.locator(`[id="${(await c.getAttribute('aria-controls'))!}"]`);
  await expect(panel).toBeVisible();
  const hits = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return [
      // Inset past the 16 px corner radius (hit testing follows the rounded shape).
      [r.left + 16, r.top + 16],
      [r.right - 16, r.top + 16],
      [r.right - 16, r.bottom - 16],
    ].map(([x, y]) => el.contains(document.elementFromPoint(x!, y!)));
  });
  expect(hits).toEqual([true, true, true]);
  await expect(panel.getByTestId('sync-popover-now')).toBeInViewport({ ratio: 1 });
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
  const TEXT: Record<string, RegExp> = {
    synced: /^Đã đồng bộ/,
    'local-only': /^Lưu trên thiết bị — Dữ liệu đã lưu trên thiết bị/,
  };
  const state = (await c.getAttribute('data-sync-state'))!;
  expect(Object.keys(TEXT)).toContain(state);
  await expect(c).toHaveAccessibleName(TEXT[state]!);
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
  // Announced: the message appears inside an always-mounted live region.
  await expect(page.getByTestId('offline-banner-live')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByTestId('offline-banner-live').getByTestId('offline-banner')).toHaveCount(
    1,
  );
  await expect(banner).toContainText('Đang offline');
  await expect(banner).toContainText('gửi khi có mạng'); // E2E build: sync available (mock)
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

  // Max 3 stacked (toasts with an action do not auto-hide, so the count is stable).
  const withAction = page.getByTestId('toast-success');
  for (let i = 0; i < 4; i++) await withAction.click();
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
  await expect(count).toHaveText('Đã xóa: 1');
  // An action toast waits for the user (WCAG 2.2.1): still there after the 4 s timeout.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(4500);
  const undo = page.getByRole('button', { name: 'Hoàn tác', exact: true });
  await expect(undo).toBeVisible();
  await undo.focus();
  await page.keyboard.press('Enter');
  await expect(count).toHaveText('Đã xóa: 0');
  await expect(page.getByTestId('toast')).toHaveCount(0);
  // Focus is not dropped to <body> when the focused toast goes away.
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
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
  // A dialog does not add a history entry (only sheets do).
  const before = await page.evaluate(() => history.length);
  await open.click();
  expect(await page.evaluate(() => history.length)).toBe(before);
  await page.getByTestId('dialog-confirm-delete').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('dialog-deleted')).toHaveText('Đã xóa: 1');
  // The toast raised from inside the dialog shows once it has closed, and is not inert.
  const toast = page.getByTestId('toast').filter({ hasText: 'Đã xóa tài liệu' });
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => el.closest('[inert]') === null)).toBe(true);
  await toast.getByRole('button', { name: 'Đóng thông báo' }).click();
  await expect(toast).toHaveCount(0);
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
