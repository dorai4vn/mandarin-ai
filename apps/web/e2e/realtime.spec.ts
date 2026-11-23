import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('realtime client-secret request is labelled MOCK without an OpenAI key', async ({ page }) => {
  await signIn(page);
  await page.goto('/lab/realtime');
  await page.getByTestId('realtime-request').click();
  await expect(page.getByRole('status')).toContainText('MOCK');
  await expect(page.locator('main')).toContainText('(đã che)');
});
