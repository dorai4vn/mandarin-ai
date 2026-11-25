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
    // Today + sync cards sit side by side on desktop (UI-5 home).
    const first = await page.getByTestId('home-today').boundingBox();
    const second = await page.getByTestId('home-sync').boundingBox();
    expect(Math.abs((first?.y ?? 0) - (second?.y ?? 1))).toBeLessThan(4);
    expect((second?.x ?? 0) > (first?.x ?? 0) + (first?.width ?? 0) - 1).toBe(true);
    // The three study tiles share one row.
    const tiles = page.getByTestId('home-study').locator('> *');
    const ys = await tiles.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().y)),
    );
    expect(new Set(ys).size).toBe(1);
    // M2 dictionary: list and detail side by side on desktop (D-030).
    const { signIn } = await import('./helpers');
    await signIn(page);
    await page.goto('/dictionary');
    await page.getByTestId('dictionary-search').fill('shan');
    await page.getByTestId('dictionary-row').first().click();
    const list = await page.getByRole('region', { name: 'Kết quả tìm kiếm' }).boundingBox();
    const detail = await page.getByRole('region', { name: 'Chi tiết từ' }).boundingBox();
    expect(Math.abs((list?.y ?? 0) - (detail?.y ?? 1))).toBeLessThan(40);
    expect((detail?.x ?? 0) >= (list?.x ?? 0) + (list?.width ?? 0)).toBe(true);
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
        (await page.evaluate(() => document.activeElement?.textContent ?? '')).includes(
          'Từ điển cá nhân',
        )
      )
        break;
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dictionary$/);
  });
});
