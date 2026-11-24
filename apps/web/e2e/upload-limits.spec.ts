import { open } from 'node:fs/promises';
import { PDF_UPLOAD_LIMITS } from '@mandarin/contracts';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { deviceClass, signIn } from './helpers';

/**
 * D-040 — 50 MB per PDF (50 MiB = 52 428 800 bytes, inclusive), enforced identically by the web
 * client and the API. Large accepted uploads run on the desktop project of each engine (they go to
 * the development in-memory store); the cheap rejections run on every viewport. Real Supabase
 * Storage limits are checked by scripts/test-storage-upload-limit.mjs in the CI database job.
 */
const MiB = 1024 * 1024;
test.setTimeout(120_000);

/** Sparse file on disk: `%PDF-` header (or not) followed by zeros, created instantly. */
async function makeFile(info: TestInfo, name: string, size: number, pdf = true) {
  const path = info.outputPath(name);
  const fh = await open(path, 'w');
  if (pdf) await fh.write(Buffer.from('%PDF-1.7\n%âãÏÓ\n'));
  await fh.truncate(size);
  await fh.close();
  return path;
}

function countUploads(page: Page) {
  const counter = { n: 0 };
  page.on('request', (r) => {
    if (r.url().includes('/v1/uploads/pdf') && r.method() === 'POST') counter.n += 1;
  });
  return counter;
}

test('the limit shown to users matches the shared contract', async ({ page }) => {
  expect(PDF_UPLOAD_LIMITS.maxBytes).toBe(50 * MiB);
  await page.goto('/lab/upload');
  await expect(page.getByTestId('pdf-limit')).toHaveText('Tối đa 50 MB mỗi tệp');
});

for (const [label, size] of [
  ['20 MB', 20 * MiB],
  ['49 MB', 49 * MiB],
  ['exactly 50 MB', 50 * MiB],
] as const) {
  test(`accepts a ${label} PDF end to end, client and API`, async ({ page, browserName }, info) => {
    test.skip(deviceClass(page) !== 'desktop', 'large uploads run once per engine (desktop)');
    const path = await makeFile(info, `giao-trinh-${size}.pdf`, size);
    await signIn(page);
    const uploads = countUploads(page);
    await page.goto('/lab/upload');
    if (browserName === 'chromium') {
      // Main-thread responsiveness: record long tasks while the file is checked and sent.
      await page.evaluate(() => {
        (window as unknown as { __long: number[] }).__long = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            (window as unknown as { __long: number[] }).__long.push(e.duration);
        }).observe({ type: 'longtask' });
      });
    }
    await expect(page.getByTestId('pdf-input')).toBeEnabled();
    await expect(page.getByTestId('pdf-input')).toBeEnabled();
    await page.getByTestId('pdf-input').setInputFiles(path);
    await expect(page.getByRole('status')).toContainText('MOCK', { timeout: 90_000 });
    await expect(page.locator('main')).toContainText(`kích thước: ${size} bytes`);
    expect(uploads.n).toBe(1);
    if (browserName === 'chromium') {
      const longest = await page.evaluate(() =>
        Math.max(0, ...(window as unknown as { __long: number[] }).__long),
      );
      expect(longest, 'no main-thread task ≥ 250 ms while handling the file').toBeLessThan(250);
    }
  });
}

test('rejects 50 MB + 1 byte in the browser with a clear message, without uploading', async ({
  page,
}, info) => {
  const path = await makeFile(info, 'qua-lon.pdf', 50 * MiB + 1);
  await signIn(page);
  const uploads = countUploads(page);
  await page.goto('/lab/upload');
  await expect(page.getByTestId('pdf-input')).toBeEnabled();
  await page.getByTestId('pdf-input').setInputFiles(path);
  await expect(page.getByRole('status')).toContainText(
    'Tệp "qua-lon.pdf" nặng 50 MB (52.428.801 byte), vượt giới hạn 50 MB (52.428.800 byte) mỗi tệp. Hãy chia nhỏ hoặc nén PDF rồi thử lại.',
  );
  expect(uploads.n).toBe(0);
});

test('rejects a 60 MB file by size before reading its content', async ({ page }, info) => {
  const path = await makeFile(info, 'rat-lon.pdf', 60 * MiB);
  await signIn(page);
  const uploads = countUploads(page);
  await page.goto('/lab/upload');
  await expect(page.getByTestId('pdf-input')).toBeEnabled();
  await page.getByTestId('pdf-input').setInputFiles(path);
  await expect(page.getByRole('status')).toContainText(
    'nặng 60 MB (62.914.560 byte), vượt giới hạn 50 MB',
  );
  expect(uploads.n).toBe(0);
});

test('rejects a 49 MB file that is not a PDF, without uploading', async ({ page }, info) => {
  const path = await makeFile(info, 'gia-mao.pdf', 49 * MiB, false);
  await signIn(page);
  const uploads = countUploads(page);
  await page.goto('/lab/upload');
  await expect(page.getByTestId('pdf-input')).toBeEnabled();
  await page.getByTestId('pdf-input').setInputFiles(path);
  await expect(page.getByRole('status')).toContainText('Tệp không phải PDF');
  expect(uploads.n).toBe(0);
});
