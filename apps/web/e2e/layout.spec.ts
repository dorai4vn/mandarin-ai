import { expect, test } from '@playwright/test';
import { deviceClass, expectNoHorizontalScroll, screenshot } from './helpers';

const PAGES = ['/', '/dictionary', '/practice', '/lab', '/lab/handwriting', '/lab/offline'];

test.describe('responsive layout (D-030)', () => {
  for (const path of PAGES) {
    test(`navigation variant and no horizontal scroll on ${path}`, async ({ page }, info) => {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      const cls = deviceClass(page);
      await expect(page.getByTestId('nav-bottom')).toBeVisible({ visible: cls === 'phone' });
      await expect(page.getByTestId('nav-rail')).toBeVisible({ visible: cls === 'tablet' });
      await expect(page.getByTestId('nav-sidebar')).toBeVisible({ visible: cls === 'desktop' });
      await expectNoHorizontalScroll(page);
      await screenshot(page, info, path === '/' ? 'home' : path.slice(1).replaceAll('/', '-'));
    });
  }

  test('desktop is not a stretched phone layout', async ({ page }) => {
    test.skip(deviceClass(page) !== 'desktop', 'desktop-only check');
    await page.goto('/');
    const cards = page.locator('main section');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    // Today + sync cards sit side by side on desktop.
    expect(Math.abs((first?.y ?? 0) - (second?.y ?? 1))).toBeLessThan(4);
    await page.goto('/dictionary');
    await expect(page.getByRole('heading', { name: 'Chi tiết' })).toBeVisible();
  });

  test('navigation works by keyboard on desktop', async ({ page, browserName }) => {
    test.skip(deviceClass(page) !== 'desktop', 'desktop-only check');
    test.skip(
      browserName === 'webkit',
      'WebKit skips links on Tab unless "Tab to links" is enabled (Safari default)',
    );
    await page.goto('/');
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      if (
        (await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Từ điển')
      )
        break;
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dictionary$/);
  });
});
