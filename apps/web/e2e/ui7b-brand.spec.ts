import { expect, test } from '@playwright/test';
import { deviceClass } from './helpers';

/**
 * UI-7B brand (D-041, docs/design/brand/README.md): the approved raster mark (light/dark per
 * theme), the lockup text in Nunito (name 800, tagline 600 uppercase 0.16em), favicons in <head>.
 */
const brandLink = (page: import('@playwright/test').Page) =>
  page.getByRole('link', { name: 'Mandarin AI — Trang chủ' }).filter({ visible: true });

test('mark follows the theme; lockup uses Nunito; link has one accessible name', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const link = brandLink(page);
  await expect(link).toHaveCount(1);
  const mark = link.locator('.brand-mark');
  await expect(mark).toHaveCSS('background-image', /mark-light\.webp/);
  // The image actually loaded (not a broken URL).
  expect(
    await page.evaluate(async () => {
      const img = new Image();
      img.src = '/brand/mark-light.webp';
      await img.decode();
      return img.naturalWidth;
    }),
  ).toBeGreaterThan(0);
  const name = link.getByText('Mandarin AI', { exact: true });
  await expect(name).toHaveCSS('font-weight', '800');
  expect(await name.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/nunito/i);
  // Rendered with the self-hosted Nunito (not a fallback).
  expect(await page.evaluate(() => document.fonts.check('800 20px "Nunito"'))).toBe(true);
  if (deviceClass(page) === 'desktop') {
    const tag = link.getByText('Tự học tiếng Trung', { exact: true });
    await expect(tag).toHaveCSS('text-transform', 'uppercase');
    await expect(tag).toHaveCSS('font-weight', '600');
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(mark).toHaveCSS('background-image', /mark-dark\.webp/);
});

test('favicons and apple-touch-icon are declared', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('link[rel~="icon"], link[rel="apple-touch-icon"]', (ls) =>
    ls.map(
      (l) =>
        `${l.getAttribute('rel')} ${l.getAttribute('sizes') ?? ''} ${new URL((l as HTMLLinkElement).href).pathname}`,
    ),
  );
  for (const want of [
    'icon 16x16 /icons/favicon-16.png',
    'icon 32x32 /icons/favicon-32.png',
    'icon 48x48 /icons/favicon-48.png',
    'apple-touch-icon 180x180 /icons/apple-touch-icon.png',
  ])
    expect(hrefs).toContain(want);
});
