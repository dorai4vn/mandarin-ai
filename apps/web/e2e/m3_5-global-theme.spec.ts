import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Global Light/Dark/System (owner requirement): the AppShell toggle uses the shared theme module,
 * persists across navigation/reload, and representative routes pass axe in both themes.
 */
const toggle = (page: Page) => page.locator('[data-testid="shell-theme-toggle"]:visible');
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

test('shell toggle cycles system → light → dark and persists across navigation and reload', async ({
  page,
}) => {
  await page.goto('/lab/visual-mnemonic');
  await expect(toggle(page)).toHaveAttribute('data-theme-choice', 'system');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('data-theme-choice', 'light');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('data-theme-choice', 'dark');
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBe('dark');
  await page.reload();
  expect(await theme(page)).toBe('dark');
  await expect(toggle(page)).toHaveAttribute('data-theme-choice', 'dark');
  await toggle(page).click();
  expect(await theme(page)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBeNull();
});

test('toggle has an accessible name stating current and next choice', async ({ page }) => {
  await page.goto('/lab/visual-mnemonic');
  await expect(toggle(page)).toHaveAttribute('aria-label', /Giao diện: Theo hệ thống.*Sáng/);
});

for (const scheme of ['light', 'dark'] as const) {
  for (const route of ['/lab/visual-mnemonic', '/profile']) {
    test(`axe + keyboard focus: ${route} in ${scheme}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('mandarin.theme', t), scheme);
      await page.goto(route);
      expect(await theme(page)).toBe(scheme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      ).toEqual([]);
      await toggle(page).focus();
      await expect(toggle(page)).toBeFocused();
      const outline = await toggle(page).evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(outline).not.toBe('none');
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(over).toBeLessThanOrEqual(1);
    });
  }
}
