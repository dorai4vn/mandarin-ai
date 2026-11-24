import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

/**
 * UI-1 visual regression guard at 320 / 390 / 768 / 1024 / 1440 px (D-039 QC). UI-1 changes only
 * tokens and fonts: the navigation variant per width must stay exactly as in M0 (D-030 breakpoints
 * until UI-3), nothing may scroll horizontally, and V2 tokens must be in effect. Screenshots are
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
/**
 * Pre-existing M0 overflow at 320 px, measured on `main` before UI-1 (2026-11-24): /lab 23 px
 * (capability table), /lab/offline 73 px (status block). Not caused by UI-1 (V2 reduces the second
 * to 59 px); fixing it changes Lab layouts, outside UI-1 → follow-up FU-1 (UI-3 adds 320 px to the
 * main matrix). Reported as an annotation on every run, never silently skipped.
 */
const KNOWN_OVERFLOW_320 = new Set(['/lab', '/lab/offline']);

test.beforeEach(() => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'widths are set explicitly');
});

for (const [width, height] of WIDTHS) {
  test(`layout unchanged and no horizontal scroll at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      // M0 navigation variants (unchanged by UI-1): phone < 768, rail 768–1279, sidebar ≥ 1280.
      await expect(page.getByTestId('nav-bottom')).toBeVisible({ visible: width < 768 });
      await expect(page.getByTestId('nav-rail')).toBeVisible({
        visible: width >= 768 && width < 1280,
      });
      await expect(page.getByTestId('nav-sidebar')).toBeVisible({ visible: width >= 1280 });
      if (width === 320 && KNOWN_OVERFLOW_320.has(path)) {
        info.annotations.push({
          type: 'known-issue FU-1',
          description: `${path} overflows at 320px (M0)`,
        });
        continue;
      }
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
