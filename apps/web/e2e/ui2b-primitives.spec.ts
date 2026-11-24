import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

/**
 * UI-2B primitives (docs/design/UI2B_PLAN.md §5): Tabs, Tooltip, ProgressBar/Ring, Skeleton,
 * EmptyState/ErrorState, PageHeader V2, Server Component rendering.
 */
async function hydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}
const hoverCapable = (page: Page) => page.evaluate(() => matchMedia('(hover: hover)').matches);

test('tabs: WAI-ARIA roles, roving tabindex, arrows wrap, Home/End, panels linked', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const root = page.getByTestId('tabs-segmented');
  const list = root.getByRole('tablist', { name: 'Chế độ xem từ (ví dụ)', exact: true });
  const tabs = list.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0');
  await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');

  for (let i = 0; i < 3; i++) {
    const tab = tabs.nth(i);
    const panelId = (await tab.getAttribute('aria-controls'))!;
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    await expect(panel).toHaveAttribute('aria-labelledby', (await tab.getAttribute('id'))!);
  }

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(0)).toHaveAttribute('tabindex', '-1');
  await expect(root.getByRole('tabpanel')).toHaveCount(1); // hidden panels are not exposed
  await expect(root.getByRole('tabpanel')).toContainText('Câu ví dụ');

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowRight'); // wraps
  await expect(tabs.nth(0)).toBeFocused();
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft'); // wraps back
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

  // Tab moves focus OUT of the tablist into the active panel (one tab stop).
  await page.keyboard.press('Tab');
  await expect(root.getByRole('tabpanel')).toBeFocused();
});

test('tabs: a wide tablist scrolls inside itself at 320 px, the page does not', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await hydrated(page, '/lab/design');
  const list = page.getByTestId('tabs-underline').getByRole('tablist');
  const tabs = list.getByRole('tab');
  expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await tabs.first().focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  // The selected tab was scrolled into view inside the list.
  const l = (await list.boundingBox())!;
  const t = (await tabs.last().boundingBox())!;
  expect(t.x + t.width).toBeLessThanOrEqual(l.x + l.width + 1);
  await expectNoHorizontalScroll(page);
});

test('tooltip: hover and keyboard focus, hoverable, persistent, dismissible (WCAG 1.4.13)', async ({
  page,
}, info) => {
  await hydrated(page, '/lab/design');
  const trigger = page.getByTestId('icon-search');
  const tipId = (await trigger.getAttribute('aria-describedby'))!;
  const tip = page.locator(`[id="${tipId}"]`);
  await expect(tip).toHaveAttribute('role', 'tooltip');
  await expect(tip).toBeHidden();
  await expect(trigger).toHaveAccessibleDescription('Tìm kiếm');
  // M10: no duplicate title attribute.
  await expect(trigger).not.toHaveAttribute('title');

  // Keyboard focus opens it (all devices).
  await trigger.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Tìm kiếm');
  // Persistent: no timeout.
  await page.waitForTimeout(1500);
  await expect(tip).toBeVisible();
  // Dismissible: Escape hides it without moving focus.
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.blur();

  const hover = await hoverCapable(page);
  if (info.project.name.endsWith('desktop')) expect(hover).toBe(true);
  if (hover) {
    await trigger.hover();
    await expect(tip).toBeVisible();
    // Hoverable: the pointer can move from the trigger onto the bubble without it closing.
    const t = (await trigger.boundingBox())!;
    const b = (await tip.boundingBox())!;
    await page.mouse.move(t.x + t.width / 2, t.y + 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await expect(tip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
    await page.mouse.move(0, 0);
    await expect(tip).toBeHidden();
  }
});

test('tooltip stays inside the viewport at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await hydrated(page, '/lab/design');
  const trigger = page.getByTestId('icon-search');
  await trigger.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const tip = page.locator(`[id="${(await trigger.getAttribute('aria-describedby'))!}"]`);
  await expect(tip).toBeVisible();
  const b = (await tip.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(320);
  await expectNoHorizontalScroll(page);
});

test('progress: ARIA values, clamping, indeterminate, ring', async ({ page }) => {
  await hydrated(page, '/lab/design');
  const bar = page.getByTestId('progress-bar');
  await expect(bar).toHaveAccessibleName('Tiến độ phiên (ví dụ)');
  await expect(bar).toHaveAttribute('aria-valuenow', '7');
  await expect(bar).toHaveAttribute('aria-valuemax', '20');
  await expect(bar).toHaveAttribute('aria-valuetext', '7 / 20');
  const minus = page.getByRole('button', { name: '−5', exact: true });
  const plus = page.getByRole('button', { name: '+5', exact: true });
  await minus.click();
  await minus.click();
  await expect(bar).toHaveAttribute('aria-valuenow', '0'); // 7 − 10 clamped
  for (let i = 0; i < 6; i++) await plus.click();
  await expect(bar).toHaveAttribute('aria-valuenow', '20'); // clamped to max

  const ind = page.getByTestId('progress-indeterminate');
  await expect(ind).not.toHaveAttribute('aria-valuenow');
  await expect(ind).toHaveAttribute('aria-busy', 'true');

  const ring = page.getByTestId('progress-ring');
  await expect(ring).toHaveAttribute('role', 'progressbar');
  await expect(ring).toHaveAttribute('aria-valuenow', '60');
});

test('reduced motion: indeterminate stripe and skeleton shimmer stop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hydrated(page, '/lab/design');
  const stripe = page.getByTestId('progress-indeterminate').locator('span').first();
  expect(await stripe.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.getByText('Đang xử lý…', { exact: true })).toBeVisible();

  await page.getByTestId('skeleton-toggle').click();
  const group = page.getByTestId('skeleton-group');
  await expect(group).toBeVisible();
  const block = group.locator('[data-skeleton]').first();
  expect(await block.evaluate((el) => getComputedStyle(el, '::after').display)).toBe('none');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await stripe.evaluate((el) => getComputedStyle(el).animationName)).toBe('progress-slide');
  await expect(page.getByText('Đang xử lý…', { exact: true })).toBeHidden();
});

test('skeleton: appears only after 300 ms, busy region announced, blocks hidden', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const toggle = page.getByTestId('skeleton-toggle');
  const started = Date.now();
  await toggle.click();
  const group = page.getByTestId('skeleton-group');
  await expect(group).toBeVisible();
  expect(Date.now() - started).toBeGreaterThanOrEqual(300);
  await expect(group).toHaveAttribute('aria-busy', 'true');
  await expect(group.getByRole('status')).toHaveText('Đang tải…');
  const blocks = group.locator('[data-skeleton]');
  await expect(blocks).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(blocks.nth(i)).toHaveAttribute('aria-hidden', 'true');
  await toggle.click();
  await expect(group).toHaveCount(0);
});

test('empty state: coming-soon has no action; first-use has exactly one', async ({ page }) => {
  await hydrated(page, '/lab/design');
  const soon = page.getByTestId('empty-coming-soon');
  await expect(soon).toContainText('Ra mắt ở M6');
  await expect(soon.locator('a, button')).toHaveCount(0);
  await expect(soon.getByRole('heading', { level: 3 })).toHaveText('Nghe hiểu');
  const first = page.getByTestId('empty-first-use');
  await expect(first.locator('a, button')).toHaveCount(1);
});

test('error state: section is announced and does not steal focus; retry works', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const trigger = page.getByTestId('error-trigger');
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await trigger.click();
  const err = page.getByTestId('error-section');
  await expect(err).toHaveAttribute('role', 'alert');
  await expect(err).toContainText('Không tải được danh sách');
  const retry = err.getByRole('button', { name: 'Thử lại', exact: true });
  await expect(retry).not.toBeFocused();
  // Technical detail is collapsed by default.
  await expect(err.getByText('Ví dụ: provider_http_error 502')).toBeHidden();
  await err.getByText('Chi tiết', { exact: true }).click();
  await expect(err.getByText('Ví dụ: provider_http_error 502')).toBeVisible();
  await retry.click();
  await expect(err).toHaveCount(0);
});

test('error state (page): "Thử lại" gets focus; one h1; link home', async ({ page }) => {
  await hydrated(page, '/lab/design/error');
  const err = page.getByTestId('error-page');
  const retry = err.getByRole('button', { name: 'Thử lại', exact: true });
  await expect(retry).toBeFocused();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(err.getByRole('link', { name: 'Về Hôm nay', exact: true })).toHaveAttribute(
    'href',
    '/',
  );
  await page.keyboard.press('Enter');
  await expect(err).toContainText('Đã thử lại: 1');
  await expectNoHorizontalScroll(page);
});

test('server component: Button loading, ButtonLink and class builders render server-side', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto('/lab/design/server');
  expect(res?.status()).toBe(200);
  // Present in the server HTML, before hydration.
  const html = await res!.text();
  expect(html).toContain('data-testid="server-loading"');
  expect(html).toContain('aria-busy="true"');
  const loading = page.getByTestId('server-loading');
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('server-link')).toHaveAttribute('href', '/lab/design');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('new pages: no serious/critical axe violations', async ({ page }) => {
  for (const path of ['/lab/design/server', '/lab/design/error']) {
    await hydrated(page, path);
    const r = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});

const ROUTES = [
  '/',
  '/library',
  '/practice',
  '/dictionary',
  '/profile',
  '/lab',
  '/lab/handwriting',
  '/lab/audio',
  '/lab/upload',
  '/lab/offline',
  '/lab/realtime',
  '/lab/session',
  '/lab/design',
  '/lab/design/server',
];

test('PageHeader V2: exactly one h1 per route, text.h1 size by breakpoint', async ({ page }) => {
  const wide = (page.viewportSize()?.width ?? 1440) >= 768;
  for (const path of ROUTES) {
    await page.goto(path);
    const h1 = page.locator('main h1');
    await expect(h1, path).toHaveCount(1);
    const size = await h1.evaluate((el) => getComputedStyle(el).fontSize);
    expect(size, path).toBe(wide ? '30px' : '26px');
  }
});

test('tabs: keyboard focus ring is drawn inside the tab (not clipped by the scrolling list)', async ({
  page,
}) => {
  await hydrated(page, '/lab/design');
  const tab = page.getByTestId('tabs-underline').getByRole('tab').first();
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  const focused = page.getByTestId('tabs-underline').getByRole('tab').nth(1);
  await expect(focused).toBeFocused();
  const ring = await focused.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, offset: parseFloat(s.outlineOffset) };
  });
  expect(ring.style).toBe('solid');
  expect(ring.offset).toBeLessThan(0);
});
