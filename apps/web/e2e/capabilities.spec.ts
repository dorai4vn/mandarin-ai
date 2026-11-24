import { expect, test } from '@playwright/test';
import { deviceClass } from './helpers';

test('capability report renders in every engine and core features are present', async ({
  page,
  browserName,
}, info) => {
  await page.goto('/lab');
  await expect(page.getByTestId('cap-pointerEvents')).toHaveAttribute('data-state', 'supported');
  await expect(page.getByTestId('cap-fileUpload')).toHaveAttribute('data-state', 'supported');
  // localhost counts as a secure context in all engines.
  await expect(page.getByTestId('cap-secureContext')).toHaveAttribute('data-state', 'supported');
  await expect(page.getByTestId('env-info')).toHaveAttribute(
    'data-device-class',
    deviceClass(page),
  );
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0); // no core-feature compatibility warning
  const rows = await page
    .locator('[data-testid^="cap-"]')
    .evaluateAll((els) =>
      els.map((e) => `${e.getAttribute('data-testid')?.slice(4)}=${e.getAttribute('data-state')}`),
    );
  await info.attach(`capabilities-${browserName}`, {
    body: rows.join('\n'),
    contentType: 'text/plain',
  });
});
