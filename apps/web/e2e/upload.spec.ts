import { expect, test } from '@playwright/test';
import { SAMPLE_PDF, deviceClass, signIn } from './helpers';

test('PDF upload via file picker is validated and stored privately', async ({ page }) => {
  await signIn(page);
  await page.goto('/lab/upload');
  await page
    .getByTestId('pdf-input')
    .setInputFiles({ name: 'bai-mau.pdf', mimeType: 'application/pdf', buffer: SAMPLE_PDF });
  await expect(page.getByRole('status')).toContainText('MOCK');
  await expect(page.locator('main')).toContainText('/imports/');
});

test('non-PDF files are rejected before upload', async ({ page }) => {
  await signIn(page);
  let uploads = 0;
  await page.route('**/v1/uploads/pdf', (r) => {
    uploads += 1;
    return r.continue();
  });
  await page.goto('/lab/upload');
  await page.getByTestId('pdf-input').setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('<html>'),
  });
  await expect(page.getByRole('status')).toContainText('Tệp không phải PDF');
  expect(uploads).toBe(0);
});

test('desktop drag-and-drop upload', async ({ page }) => {
  test.skip(deviceClass(page) !== 'desktop', 'drag-and-drop is a desktop interaction');
  await signIn(page);
  await page.goto('/lab/upload');
  const bytes = [...SAMPLE_PDF];
  await page.getByTestId('dropzone').evaluate((el, data) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(data)], 'keo-tha.pdf', { type: 'application/pdf' }));
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, bytes);
  await expect(page.getByRole('status')).toContainText('MOCK');
});
