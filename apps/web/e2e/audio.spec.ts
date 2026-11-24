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
  const consoleLines: string[] = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));
  await signIn(page);
  await page.goto('/lab/audio');
  await page.getByTestId('rec-start').click();
  try {
    await expect(page.getByTestId('rec-stop')).toBeVisible({ timeout: 15_000 });
  } catch (e) {
    // Diagnostics in the CI log: what the page showed instead of the Stop button.
    const status = await page.getByRole('status').allInnerTexts();
    const perm = await page
      .getByTestId('mic-permission')
      .innerText()
      .catch(() => '—');
    const ctx = await page.evaluate(async () => {
      try {
        const c = new AudioContext();
        const s = c.state;
        await c.close();
        return `fresh AudioContext state=${s}`;
      } catch (err) {
        return `AudioContext error: ${String(err)}`;
      }
    });
    throw new Error(
      `Recording did not start. status=${JSON.stringify(status)} permission=${perm} ${ctx}\nconsole:\n${consoleLines.join('\n')}\n${String(e)}`,
    );
  }
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
