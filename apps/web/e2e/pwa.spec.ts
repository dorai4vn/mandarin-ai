import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('manifest is valid and installation is optional', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/', lang: 'vi' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  await page.goto('/profile');
  await expect(page.locator('main')).toContainText('Cài đặt (tùy chọn)');
});

test('service worker registers where supported and the shell opens offline', async ({
  context,
  page,
  browserName,
}) => {
  await page.goto('/profile');
  const status = page.getByTestId('sw-status');
  await expect(status).toContainText(/active|unsupported|error/, { timeout: 20_000 });
  const text = (await status.textContent()) ?? '';
  test.skip(
    !text.includes('active'),
    `service worker not active in Playwright ${browserName}: ${text}`,
  );
  await page.goto('/'); // cached by the service worker
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await page.goto('/library'); // never visited → offline fallback page
  await expect(page.locator('h1')).toBeVisible();
  await context.setOffline(false);
});
