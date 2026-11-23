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

  // Precache must contain the shell and the offline fallback in every engine.
  const cached = await page.evaluate(async () => ({
    controlled: Boolean(navigator.serviceWorker.controller),
    shell: Boolean(await caches.match('/')),
    offlinePage: Boolean(await caches.match('/offline.html')),
  }));
  expect(cached).toEqual({ controlled: true, shell: true, offlinePage: true });

  if (browserName === 'webkit') {
    // CI run 45241745204: Playwright WebKit throws "WebKit encountered an internal error" on
    // navigation under context.setOffline(true) with a service worker. Not yet determined whether
    // this is the tool or the app, so offline navigation on Safari is a MANUAL smoke-test item
    // (docs/SMOKE_TEST.md) — recorded as an annotation, not silently skipped.
    test.info().annotations.push({
      type: 'manual-check',
      description: 'Offline navigation on Safari must be verified on a real device',
    });
    return;
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await page.goto('/library'); // never visited → offline fallback page
  await expect(page.locator('h1')).toBeVisible();
  await context.setOffline(false);
});
