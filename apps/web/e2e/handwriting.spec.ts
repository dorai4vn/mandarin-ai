import { expect, test } from '@playwright/test';
import { SHAN, YI, deviceClass, drawStrokes, signIn } from './helpers';

const SHAN_CHAR = String.fromCodePoint(0x5c71);

for (const pointerType of ['mouse', 'touch', 'pen'] as const) {
  test(`canvas accepts ${pointerType} input and the server recognizes synthetic 山`, async ({
    page,
  }) => {
    test.skip(pointerType === 'mouse' && deviceClass(page) === 'phone', 'phones have no mouse');
    await signIn(page);
    await page.goto('/lab/handwriting');
    // Target must not be in the DOM before submission (PRD-05).
    expect(await page.locator('main').innerText()).not.toContain(SHAN_CHAR);
    await drawStrokes(page, SHAN, pointerType);
    await expect(page.getByTestId('handwriting-canvas')).toHaveAttribute(
      'data-pointer-kind',
      pointerType,
    );
    await page.getByTestId('hw-submit').click();
    await expect(page.getByTestId('hw-verdict')).toContainText('Đúng');
    await expect(page.getByTestId('hw-candidates').locator('li').first()).toHaveText(SHAN_CHAR);
    await expect(page.locator('main')).toContainText('adapter=hanzilookup-mmah source=live');
  });
}

test('a different character is not graded as correct', async ({ page }) => {
  await signIn(page);
  await page.goto('/lab/handwriting');
  await drawStrokes(page, YI, deviceClass(page) === 'desktop' ? 'mouse' : 'touch');
  await page.getByTestId('hw-submit').click();
  await expect(page.getByTestId('hw-verdict')).toContainText('Chưa đúng');
});

test('without sign-in the page explains instead of failing silently', async ({ page }) => {
  await page.goto('/lab/handwriting');
  await drawStrokes(page, SHAN, 'touch');
  await page.getByTestId('hw-submit').click();
  await expect(page.getByRole('status')).toContainText('chưa đăng nhập');
});
