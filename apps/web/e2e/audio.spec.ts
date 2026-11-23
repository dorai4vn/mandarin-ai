import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('records from the (fake) microphone and produces 16 kHz mono WAV', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit has no fake media device — verify on real Safari (manual)',
  );
  await signIn(page);
  await page.goto('/lab/audio');
  await page.getByTestId('rec-start').click();
  await page.waitForTimeout(1500);
  await page.getByTestId('rec-stop').click();
  await expect(page.getByTestId('wav-info')).toContainText('WAV 16000 Hz · 1 kênh · 16-bit');
  await page.getByTestId('assess').click();
  await expect(page.getByRole('status')).toContainText('MOCK');
});

test('denied microphone permission shows recovery help, not a crash', async ({ page }) => {
  await page.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('denied', 'NotAllowedError'));
    }
  });
  await page.goto('/lab/audio');
  await page.getByTestId('rec-start').click();
  await expect(page.getByRole('status')).toContainText('bị từ chối');
  await expect(page.locator('main')).toContainText('cho phép Micro');
});

test('browsers without getUserMedia get a compatibility message', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });
  await page.goto('/lab/audio');
  await expect(page.getByTestId('mic-unsupported')).toBeVisible();
  // The rest of the app keeps working.
  await page.goto('/dictionary');
  await expect(page.locator('main h1')).toBeVisible();
});
