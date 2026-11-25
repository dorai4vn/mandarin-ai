import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, signIn } from './helpers';

/**
 * Visual regression guard at 320 / 390 / 768 / 1024 / 1440 px (D-039 QC): the navigation variant
 * per width follows the UI-3 breakpoints, nothing may scroll horizontally, and V2 tokens must be in
 * effect. Screenshots are
 * attached to the report for manual review. Runs once per engine (desktop project).
 */
const WIDTHS = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const;
const PAGES = ['/', '/dictionary', '/lab', '/lab/session', '/lab/upload', '/lab/offline'];
// FU-1 (overflow at 320 px on /lab and /lab/offline, from M0) is fixed in UI-3: every page is
// now checked at every width, no exceptions.

test.beforeEach(() => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'widths are set explicitly');
});

for (const [width, height] of WIDTHS) {
  test(`layout unchanged and no horizontal scroll at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await signIn(page); // /lab/offline shows its content (personal data) only when signed in
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      // UI-3 / D-039 breakpoints: phone < 768, rail (collapsed sidebar) 768–1023, sidebar ≥ 1024.
      await expect(page.getByTestId('nav-bottom')).toBeVisible({ visible: width < 768 });
      await expect(page.getByTestId('nav-rail')).toBeVisible({
        visible: width >= 768 && width < 1024,
      });
      await expect(page.getByTestId('nav-sidebar')).toBeVisible({ visible: width >= 1024 });
      await expectNoHorizontalScroll(page);
    }
    // V2 tokens are live (light): page background and primary button colour.
    await page.goto('/lab/offline');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(247, 249, 253)');
    const cta = await page
      .getByTestId('sync-now')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(cta).toBe('rgb(51, 93, 255)');
    await info.attach(`offline-${width}px`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}
