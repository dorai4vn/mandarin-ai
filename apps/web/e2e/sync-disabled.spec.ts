import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

/**
 * M0 Preview: Railway reports `sync: "disabled"` and POST /v1/sync/push answers 503. The client must
 * read that from GET /health (always 200), keep everything in IndexedDB, say so calmly, and not keep
 * firing 503 requests. The E2E API runs the development MOCK sync store; `/health` is rewritten per
 * test so the same build exercises disabled → enabled transitions. No mock result is ever presented
 * as a successful cloud sync on Preview: there `NEXT_PUBLIC_ALLOW_MOCK_SYNC` is not set.
 */
const MESSAGE = 'Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt.';

async function controlSync(page: Page, initial: 'disabled' | 'mock') {
  const state = { sync: initial, pushes: 0, push503: false };
  await page.route('**/health', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.providers.sync = state.sync;
    await route.fulfill({ response, json });
  });
  await page.route('**/v1/sync/push', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    state.pushes += 1;
    if (state.sync === 'disabled' || state.push503) {
      // What Railway answers today when the sync store is not configured.
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'provider_unavailable', message: 'Sync store is not configured' },
        }),
      });
    }
    return route.continue();
  });
  return state;
}

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function addNote(page: Page, text: string) {
  await page.getByTestId('note-input').fill(text);
  await page.getByTestId('note-add').click();
  await expect(page.getByTestId('note-list')).toContainText(text);
}

const chip = (page: Page) => page.getByTestId('sync-chip').filter({ visible: true }).first();

test('sync disabled: data stays on the device, calm message, no push and no console 503', async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await signIn(page);
  const sync = await controlSync(page, 'disabled');
  await page.goto('/lab/offline');
  await expect(page.getByTestId('offline-status')).toContainText('lưu_trữ=indexeddb');
  await addNote(page, '山 = núi');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=1');
  await expect(page.getByTestId('sync-disabled-note')).toContainText(MESSAGE);
  await expect(chip(page)).toContainText('Lưu trên thiết bị');
  await expect(chip(page)).toHaveAttribute('data-sync-state', 'local-only');
  await expect(chip(page)).not.toContainText('Đã đồng bộ');
  await expect(chip(page)).not.toContainText('lỗi');
  // Manual "sync now" re-checks /health (200) but still does not push.
  await page.getByTestId('sync-now').click();
  await page.waitForTimeout(500);
  expect(sync.pushes).toBe(0);
  await expect(page.getByTestId('outbox')).toContainText('pending · thử 0 lần');
  await expect(page.getByTestId('last-sync')).toHaveCount(0);
  // Data survives a reload and is still waiting.
  await page.reload();
  await expect(page.getByTestId('note-list')).toContainText('山 = núi');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=1');
  expect(sync.pushes).toBe(0);
  expect(errors.filter((e) => /503|Service Unavailable/i.test(e))).toEqual([]);
});

test('home page explains that cloud sync is not enabled', async ({ page }) => {
  await signIn(page);
  await controlSync(page, 'disabled');
  await page.goto('/');
  await expect(page.getByTestId('sync-disabled-note')).toHaveText(MESSAGE);
  await expect(chip(page)).toContainText('Lưu trên thiết bị');
});

test('a 503 from the push endpoint is remembered: one request, then no repeats', async ({
  page,
}) => {
  await signIn(page);
  const sync = await controlSync(page, 'mock'); // /health says available (e.g. stale)…
  sync.push503 = true; // …but the push endpoint answers 503 provider_unavailable.
  await page.goto('/lab/offline');
  await expect(page.getByTestId('offline-status')).toContainText('lưu_trữ=indexeddb');
  await addNote(page, 'ghi chú 1');
  await expect.poll(() => sync.pushes).toBe(1);
  await expect(chip(page)).toContainText('Lưu trên thiết bị');
  await addNote(page, 'ghi chú 2'); // automatic sync after a write: no new request
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(500);
  expect(sync.pushes).toBe(1);
  await expect(page.getByTestId('offline-status')).toContainText('chờ=2');
  await expect(page.getByTestId('outbox')).not.toContainText('rejected');
});

test('offline: nothing is sent, data kept; back online the status is re-checked', async ({
  context,
  page,
}) => {
  await signIn(page);
  const sync = await controlSync(page, 'disabled');
  await page.goto('/lab/offline');
  await expect(page.getByTestId('offline-status')).toContainText('lưu_trữ=indexeddb');
  await context.setOffline(true);
  await addNote(page, 'viết khi offline');
  await expect(chip(page)).toContainText('Offline');
  await expect(page.getByTestId('offline-status')).toContainText('chờ=1');
  await context.setOffline(false);
  await expect(chip(page)).toContainText('Lưu trên thiết bị');
  await page.waitForTimeout(500);
  expect(sync.pushes).toBe(0);
  await expect(page.getByTestId('note-list')).toContainText('viết khi offline');
});

test('when sync is enabled again, queued data is sent once and only then shown as synced', async ({
  page,
}) => {
  await signIn(page);
  const sync = await controlSync(page, 'disabled');
  await page.goto('/lab/offline');
  await expect(page.getByTestId('offline-status')).toContainText('lưu_trữ=indexeddb');
  await addNote(page, 'chờ máy chủ');
  await expect(chip(page)).toContainText('Lưu trên thiết bị');
  expect(sync.pushes).toBe(0);
  sync.sync = 'mock'; // E2E build accepts the development MOCK store as "enabled"
  await page.getByTestId('sync-now').click(); // forces a /health re-check
  await expect(page.getByTestId('offline-status')).toContainText('chờ=0');
  await expect(page.getByTestId('last-sync')).toContainText('applied=1');
  expect(sync.pushes).toBe(1);
  await expect(page.getByTestId('sync-disabled-note')).toHaveCount(0);
  await expect(chip(page)).toHaveAttribute('data-sync-state', 'synced');
});
