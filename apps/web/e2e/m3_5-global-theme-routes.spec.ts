import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, signIn } from './helpers';

/**
 * Global theme QC, second checkpoint: representative routes (login, dictionary, practice,
 * history lab, handwriting lab, design gallery with loading/empty/error states), the sync dialog,
 * and persistence of one choice across client navigation. Uses existing fixtures only.
 * Not covered here (see docs/M3_5_REPORT.md): signed-in dictionary rows, quiz session screens,
 * mobile "Thêm" sheet, toast, and manual visual review of every focus ring.
 */
const SERIOUS = ['serious', 'critical'];
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

async function settled(page: Page) {
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
  // The login button is disabled ("Đang tải…") until its client effect runs; enabling it starts a
  // background-colour transition (text colour flips at once). Measuring contrast before the
  // enable + transition finish samples a blend of disabled and primary colours, not the real
  // token pair — so wait for the enabled state first, then for transitions to end.
  await page.waitForFunction(
    () => !document.querySelector('main button[disabled][data-testid="login-submit"]'),
  );
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => !(a instanceof CSSTransition)),
  );
}

async function axeMain(page: Page) {
  const r = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return r.violations
    .filter((v) => SERIOUS.includes(v.impact ?? ''))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}

const ROUTES = [
  '/login',
  '/dictionary',
  '/practice',
  '/lab/hanzi-history',
  '/lab/handwriting',
  '/lab/design',
  '/lab/design/error',
];

for (const scheme of ['light', 'dark'] as const) {
  test(`axe + no overflow on representative routes in ${scheme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('mandarin.theme', t), scheme);
    for (const route of ROUTES) {
      await page.goto(route);
      await settled(page);
      expect(await theme(page), route).toBe(scheme);
      expect(await axeMain(page), route).toEqual([]);
      await expectNoHorizontalScroll(page);
    }
  });

  test(`sync dialog (signed in) is accessible in ${scheme}`, async ({ page }) => {
    await signIn(page);
    await page.addInitScript((t) => localStorage.setItem('mandarin.theme', t), scheme);
    await page.goto('/');
    await settled(page);
    const chip = page.getByTestId('sync-chip').filter({ visible: true }).first();
    await chip.click();
    const panel = page.locator(`[id="${(await chip.getAttribute('aria-controls'))!}"]`);
    await expect(panel).toBeVisible();
    const r = await new AxeBuilder({ page })
      .include(`[id="${(await chip.getAttribute('aria-controls'))!}"]`)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(r.violations.filter((v) => SERIOUS.includes(v.impact ?? ''))).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(chip).toBeFocused();
  });
}

test('one dark choice persists across navigation to every representative route', async ({
  page,
}) => {
  await page.goto('/profile');
  await settled(page);
  await page.getByTestId('theme-picker').getByText('Tối', { exact: true }).click();
  expect(await theme(page)).toBe('dark');
  for (const route of ROUTES) {
    await page.goto(route);
    expect(await theme(page), route).toBe('dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), route).toBe(
      'rgb(14, 20, 34)',
    );
  }
});

test('explicit light overrides a dark system on login', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('mandarin.theme', 'light'));
  await page.goto('/login');
  expect(await theme(page)).toBe('light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(247, 249, 253)',
  );
});
