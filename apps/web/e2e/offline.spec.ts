import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('offline write survives closing the tab and syncs once after reconnect', async ({
  context,
  page,
}) => {
  const user = crypto.randomUUID();
  await signIn(page, user);
  await page.goto('/lab/offline');
  await expect(page.getByTestId('offline-status')).toContainText('lưu_trữ=indexeddb');

  await context.setOffline(true);
  await page.getByTestId('note-input').fill('山 = núi (offline)');
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('offline-status')).toContainText('mạng=offline');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=1');
  await page.close(); // tab closed while offline

  await context.setOffline(false);
  const again = await context.newPage();
  await signIn(again, user);
  await again.goto('/lab/offline');
  await expect(again.getByTestId('note-list')).toContainText('山 = núi (offline)');
  await expect(again.getByTestId('last-sync')).toContainText('applied=1');
  await expect(again.getByTestId('offline-status')).toContainText('chờ=0');
});

test('a lost server response is retried and deduplicated (exactly once)', async ({ page }) => {
  await signIn(page);
  let first = true;
  await page.route('**/v1/sync/push', async (route) => {
    if (first) {
      first = false;
      await route.fetch(); // server stores the operation…
      await route.abort('connectionreset'); // …but the browser never gets the answer
      return;
    }
    await route.continue();
  });
  await page.goto('/lab/offline');
  await page.getByTestId('note-input').fill('水 = nước');
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('last-sync')).toContainText('retried=1');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=1');
  await page.getByTestId('sync-now').click();
  await expect(page.getByTestId('last-sync')).toContainText('applied=0 duplicate=1');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=0');
});

test('without IndexedDB the app falls back to memory and still works online', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await signIn(page);
  await page.goto('/lab/offline');
  await expect(page.getByTestId('memory-fallback')).toBeVisible();
  await page.getByTestId('note-input').fill('人 = người');
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('last-sync')).toContainText('applied=1');
});
