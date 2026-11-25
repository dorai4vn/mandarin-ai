import { expect, test, type Page } from '@playwright/test';
import { deviceClass, expectNoHorizontalScroll, signIn } from './helpers';

/**
 * UI-3 shell (COMPONENT_SPEC_V2 §6–8, RESPONSIVE_V2): sidebar collapse + memory, phone bottom
 * navigation with the "Thêm" sheet, keyboard behaviour, landscape and 320 px.
 * Runs on every project, including the UI-3 extra viewports (small / landscape / laptop).
 */
async function hydrated(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}
const width = (page: Page) => page.viewportSize()?.width ?? 1440;

test('exactly one navigation variant is visible for the width; no horizontal scroll', async ({
  page,
}) => {
  await hydrated(page);
  const cls = deviceClass(page);
  await expect(page.getByTestId('nav-bottom')).toBeVisible({ visible: cls === 'phone' });
  await expect(page.getByTestId('nav-rail')).toBeVisible({ visible: cls === 'tablet' });
  await expect(page.getByTestId('nav-sidebar')).toBeVisible({ visible: cls === 'desktop' });
  await expectNoHorizontalScroll(page);
});

test('desktop sidebar: collapsed below 1280, expanded from 1280; toggle is remembered', async ({
  page,
}) => {
  test.skip(deviceClass(page) !== 'desktop', 'desktop sidebar only');
  await hydrated(page);
  const sidebar = page.getByTestId('nav-sidebar');
  const toggle = page.getByTestId('sidebar-toggle');
  const wide = width(page) >= 1280;
  const sideWidth = async () => Math.round((await sidebar.boundingBox())!.width);

  // Default (no stored choice): auto.
  expect(await sideWidth()).toBe(wide ? 248 : 72);
  await expect(toggle).toHaveAttribute('aria-expanded', String(wide));
  await expect(toggle).toHaveAttribute('aria-controls', 'sidebar');
  // Labels stay accessible in both states.
  await expect(sidebar.getByRole('link', { name: 'Từ điển', exact: true })).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', String(!wide));
  await expect.poll(sideWidth).toBe(wide ? 72 : 248);

  // Remembered after reload (localStorage convenience).
  await page.reload();
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
  await expect.poll(sideWidth).toBe(wide ? 72 : 248);
  await expect(page.getByTestId('sidebar-toggle')).toHaveAttribute('aria-expanded', String(!wide));
  // No flash: the server HTML + inline script already lay the remembered width out before React.
  // JavaScript blocked (CSS still loads): what the user sees before hydration.
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
  await page.reload();
  expect(await sideWidth()).toBe(wide ? 72 : 248);
  await expect(page.getByTestId('sidebar-toggle')).toContainText(
    wide ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên',
  );
  await page.unroute(/\/_next\/static\/chunks\/.*\.js/);
  await expectNoHorizontalScroll(page);
});

test('collapsed sidebar shows the label as a tooltip on keyboard focus', async ({ page }) => {
  const cls = deviceClass(page);
  test.skip(cls === 'phone', 'no sidebar on phones');
  await hydrated(page);
  if (cls === 'desktop' && width(page) >= 1280) {
    await page.getByTestId('sidebar-toggle').click(); // collapse
  }
  const bar = page.getByTestId(cls === 'tablet' ? 'nav-rail' : 'nav-sidebar');
  const link = bar.getByRole('link', { name: 'Thư viện', exact: true });
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  const tip = page.locator(`[id="${(await link.getAttribute('aria-describedby'))!}"]`);
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Thư viện');
  // Fully visible beside the bar — not clipped by the sidebar's scroll container.
  const l = (await link.boundingBox())!;
  const b = (await tip.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(l.x + l.width - 1);
  expect(b.width).toBeGreaterThan(40);
  const visibleWidth = await tip.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width - 6, r.top + r.height / 2);
    return el.contains(hit);
  });
  expect(visibleWidth).toBe(true);
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
});

test('active destination is marked with aria-current', async ({ page }) => {
  await hydrated(page, '/dictionary');
  const cls = deviceClass(page);
  const nav = page.getByTestId(
    cls === 'phone' ? 'nav-bottom' : cls === 'tablet' ? 'nav-rail' : 'nav-sidebar',
  );
  await expect(nav.getByRole('link', { name: 'Từ điển', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
});

test('phone: 5 bottom items; "Thêm" sheet opens, focuses, and closes by Esc, backdrop and Back', async ({
  page,
}) => {
  test.skip(deviceClass(page) !== 'phone', 'phone navigation only');
  await hydrated(page);
  const bottom = page.getByTestId('nav-bottom');
  await expect(bottom.locator('a, button')).toHaveCount(5);
  for (const name of ['Trang chủ', 'Luyện tập', 'Từ điển', 'Thư viện'])
    await expect(bottom.getByRole('link', { name, exact: true })).toBeVisible();
  const more = page.getByTestId('nav-more');
  await expect(more).toHaveAccessibleName('Thêm');
  await expect(more).toHaveAttribute('aria-haspopup', 'dialog');

  const sheet = page.getByTestId('more-sheet');
  // Esc
  await more.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Thêm' })).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Hồ sơ', exact: true })).toBeFocused();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(more).toBeFocused(); // focus returns to the opener
  // The sheet's history entry was dropped.
  await expect.poll(() => page.evaluate(() => history.state?.sheet ?? null)).toBeNull();
  const url = page.url();
  // Backdrop click (top of the screen, outside the sheet)
  await more.click();
  await expect(sheet).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(sheet).toBeHidden();
  expect(page.url()).toBe(url);
  // Browser / Android Back closes the sheet and stays on the page
  await more.click();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  expect(page.url()).toBe(url);
  // Navigating from the sheet
  await more.click();
  const historyLength = await page.evaluate(() => history.length);
  await sheet.getByRole('link', { name: 'Phòng thử M0', exact: true }).click();
  await expect(page).toHaveURL(/\/lab$/);
  // The navigation replaced the sheet's own entry: no dead entry, Back returns to the page.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.goBack();
  await expect(page).toHaveURL(url);
  await page.goForward();
  await expect(page).toHaveURL(/\/lab$/);
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId('nav-more')).toHaveAttribute('aria-expanded', 'false');
  await expectNoHorizontalScroll(page);
});

test('phone: bottom navigation hides while typing (virtual keyboard)', async ({ page }) => {
  test.skip(deviceClass(page) !== 'phone', 'phone navigation only');
  await signIn(page); // the note field is personal data (D-042)
  await hydrated(page, '/lab/offline');
  const bottom = page.getByTestId('nav-bottom');
  await expect(bottom).toBeVisible();
  await expect(page.getByTestId('note-input')).toBeEnabled();
  await page.getByTestId('note-input').focus();
  await expect(bottom).toBeHidden();
  await page.getByTestId('note-input').blur();
  await expect(bottom).toBeVisible();
});

test('phone landscape / low height: navigation still fully reachable', async ({ page }) => {
  const h = page.viewportSize()?.height ?? 900;
  test.skip(h >= 500, 'low-height layouts only');
  await hydrated(page);
  const cls = deviceClass(page);
  const nav = page.getByTestId(cls === 'phone' ? 'nav-bottom' : 'nav-rail');
  await expect(nav).toBeVisible();
  // Every destination can be scrolled into view and is not covered.
  const links = nav.getByRole('link');
  const n = await links.count();
  expect(n).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < n; i++) {
    await links.nth(i).scrollIntoViewIfNeeded();
    await expect(links.nth(i)).toBeInViewport();
  }
  await expectNoHorizontalScroll(page);
});

test('collapsed bars show the sync status as a dot only (fits 72 px), text stays accessible', async ({
  page,
  context,
}) => {
  const cls = deviceClass(page);
  test.skip(cls === 'phone', 'no sidebar on phones');
  await hydrated(page);
  if (cls === 'desktop' && width(page) >= 1280) await page.getByTestId('sidebar-toggle').click();
  const bar = page.getByTestId(cls === 'tablet' ? 'nav-rail' : 'nav-sidebar');
  await context.setOffline(true);
  const c = bar.getByTestId('sync-chip').filter({ visible: true });
  await expect(c).toContainText('Offline'); // screen-reader text
  const b = (await c.boundingBox())!;
  const barBox = (await bar.boundingBox())!;
  expect(b.width).toBeLessThanOrEqual(32);
  expect(b.x + b.width).toBeLessThanOrEqual(barBox.x + barBox.width);
  await context.setOffline(false);
});
