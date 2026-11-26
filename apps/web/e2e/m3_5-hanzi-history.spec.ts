import { expect, test } from '@playwright/test';

test.describe('M3.5 hanzi history (山)', () => {
  test('shows sourced stages, evidence, explicit gap, mnemonic label, stroke-order gap', async ({
    page,
  }) => {
    await page.goto('/lab/hanzi-history');
    await expect(page.getByTestId('hanzi-history')).toBeVisible();
    await expect(page.getByTestId('hanzi-stage-clerical')).toHaveAttribute(
      'data-status',
      'missing',
    );
    await expect(page.getByTestId('hanzi-evidence')).toContainText('Public domain');
    await expect(page.getByTestId('hanzi-evidence')).toContainText('Chưa được chủ dự án duyệt');
    await expect(page.getByTestId('hanzi-mnemonic')).toContainText('không phải bằng chứng');
    await expect(page.getByTestId('hanzi-strokeorder-note')).toContainText('chưa có');
  });

  test('keyboard navigation, play/pause/replay', async ({ page }) => {
    await page.goto('/lab/hanzi-history');
    const stage = page.getByTestId('hanzi-history-stage');
    await expect(stage).toHaveAttribute('data-stage', 'oracle');
    await page.getByTestId('hanzi-stage-oracle').focus();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-stage', 'bronze');
    await page.getByTestId('hanzi-play').click();
    await expect(stage).toHaveAttribute('data-playing', 'true');
    await page.getByTestId('hanzi-play').click();
    await expect(stage).toHaveAttribute('data-playing', 'false');
    await page.getByTestId('hanzi-replay').click();
    await expect(stage).toHaveAttribute('data-stage', 'oracle');
    await expect(stage).toHaveAttribute('data-stage', 'bronze', { timeout: 5000 });
  });

  test('reduced motion disables the fade', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/lab/hanzi-history');
    await expect(page.getByTestId('hanzi-reduced-note')).toBeVisible();
    const t = await page
      .getByTestId('hanzi-layer-oracle')
      .evaluate((e) => getComputedStyle(e).transitionDuration);
    expect(parseFloat(t)).toBeLessThan(0.01);
  });

  test('Quick View default; Explore keeps stage and shows full evidence + uncertainty', async ({
    page,
  }) => {
    await page.goto('/lab/hanzi-history');
    const root = page.getByTestId('hanzi-history');
    await expect(root).toHaveAttribute('data-mode', 'quick');
    await expect(page.getByTestId('hanzi-uncertainty')).toBeVisible();
    await page.getByTestId('hanzi-stage-seal').click();
    await page.getByTestId('hanzi-mode-explore').click();
    await expect(root).toHaveAttribute('data-mode', 'explore');
    await expect(page.getByTestId('hanzi-history-stage')).toHaveAttribute('data-stage', 'seal');
    await expect(page.getByTestId('hanzi-evidence')).toHaveAttribute('open', '');
    await expect(page.getByTestId('hanzi-variants')).toContainText('chưa có dữ liệu');
    await expect(page.getByTestId('hanzi-skipped')).toContainText('bigseal');
    await page.getByTestId('hanzi-mode-quick').click();
    await expect(page.getByTestId('hanzi-history-stage')).toHaveAttribute('data-stage', 'seal');
    await expect(page.getByTestId('hanzi-stage-clerical')).toHaveAttribute(
      'data-status',
      'missing',
    );
  });

  test('uncertainty is visible outside the closed evidence disclosure in Quick View', async ({
    page,
  }) => {
    await page.goto('/lab/hanzi-history');
    await expect(page.getByTestId('hanzi-evidence')).not.toHaveAttribute('open', '');
    const u = page.getByTestId('hanzi-uncertainty');
    await expect(u).toBeVisible();
    expect(await u.evaluate((e) => !!e.closest('details'))).toBe(false);
  });

  test('mode buttons are pressed-state buttons and progress follows the stage', async ({
    page,
  }) => {
    await page.goto('/lab/hanzi-history');
    await expect(page.getByTestId('hanzi-mode-quick')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('hanzi-mode-explore').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('hanzi-mode-explore')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('hanzi-mode-quick')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId('hanzi-stage-seal').click();
    await expect(page.getByTestId('hanzi-progress')).toHaveAttribute('aria-valuenow', '3');
    await page.getByTestId('hanzi-next').click();
    await expect(page.getByTestId('hanzi-progress')).toHaveAttribute('data-progress', '1');
    await expect(page.getByTestId('hanzi-next')).toBeDisabled();
  });
});
