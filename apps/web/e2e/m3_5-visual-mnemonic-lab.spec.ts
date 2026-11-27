import { expect, test } from '@playwright/test';

const GLYPHS = ['山', '水', '木', '火', '日', '月', '人', '雨', '魚', '鳥'];

test.describe('M3.5 visual mnemonic lab (D4)', () => {
  test('shows 10 pending cards, no fake images, owner status', async ({ page }) => {
    await page.goto('/lab/visual-mnemonic');
    for (const g of GLYPHS) {
      const card = page.getByTestId(`mnemonic-lab-card-${g}`);
      await expect(card).toHaveAttribute('data-status', 'pending-artwork');
      await expect(card.getByTestId('mnemonic-cue')).not.toBeEmpty();
      await expect(card.getByTestId('mnemonic-art-pending')).toBeVisible();
      await expect(card.locator('img')).toHaveCount(0);
    }
    await expect(page.getByTestId('mnemonic-lab-summary')).toContainText('10/10 ảnh đang chờ');
    await expect(page.getByTestId('mnemonic-lab-summary')).toContainText('chưa có ảnh nào');
    await expect(page.getByTestId('hanzi-mnemonic').first()).toContainText('không phải bằng chứng');
  });

  test('keyboard-accessible navigation and preview mode', async ({ page }) => {
    await page.goto('/lab/visual-mnemonic');
    await expect(page.getByTestId('mnemonic-nav-鳥')).toHaveAttribute(
      'href',
      /#mnemonic-niao-bird/,
    );
    await page.getByTestId('mnemonic-preview-toggle').check();
    const card = page.getByTestId('mnemonic-lab-card-山');
    await expect(card.getByTestId('hanzi-mnemonic')).toHaveAttribute('data-art-state', 'preview');
    await expect(card.getByTestId('mnemonic-provenance')).toContainText(
      'chưa được chủ dự án duyệt',
    );
    // No candidate files exist: falls back to text, never claims approval.
    await expect(card.getByTestId('mnemonic-art-pending')).toContainText(
      'Chưa có file ảnh ứng viên',
    );
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`theme preview ${theme}: applies token theme, no overflow`, async ({ page }) => {
      await page.goto('/lab/visual-mnemonic');
      await page.getByTestId(`mnemonic-theme-${theme}`).click();
      await expect(page.getByTestId(`mnemonic-theme-${theme}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByTestId('mnemonic-lab-card-山')).toBeVisible();
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(over).toBeLessThanOrEqual(1);
    });
  }
});
