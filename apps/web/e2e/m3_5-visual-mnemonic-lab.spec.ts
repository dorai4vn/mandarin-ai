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
    await expect(page.getByTestId('mnemonic-lab-notice')).toContainText('không phải bằng chứng');
    // Notice is shown once in the header, not repeated on every card.
    await expect(page.getByTestId('mnemonic-notice')).toHaveCount(0);
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

  const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 800 },
    { name: 'tablet', width: 768, height: 900 },
    { name: 'desktop', width: 1280, height: 900 },
  ];
  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`equal-height cards, aligned slots, no clipping: ${vp.name} ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/lab/visual-mnemonic');
        await page.getByTestId(`mnemonic-theme-${theme}`).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.getByTestId('mnemonic-lab-card-山')).toBeVisible();

        const rows = await page.evaluate(() => {
          const out: {
            top: number;
            h: number;
            cardBottom: number;
            footerTop: number;
            footerBottom: number;
            artTop: number;
            artH: number;
            clipped: boolean;
            cueLines: number;
          }[] = [];
          for (const li of document.querySelectorAll<HTMLElement>(
            '[data-testid^="mnemonic-lab-card-"]',
          )) {
            const r = li.getBoundingClientRect();
            const art = li
              .querySelector<HTMLElement>('[data-testid="mnemonic-art-slot"]')!
              .getBoundingClientRect();
            const f = li
              .querySelector<HTMLElement>('[data-testid="mnemonic-footer"]')!
              .getBoundingClientRect();
            const cue = li.querySelector<HTMLElement>('[data-testid="mnemonic-cue"]')!;
            const card = li.querySelector<HTMLElement>('[data-testid="hanzi-mnemonic"]')!;
            const lh = parseFloat(getComputedStyle(cue).lineHeight) || 20;
            out.push({
              top: Math.round(r.top + window.scrollY),
              h: Math.round(r.height),
              cardBottom: Math.round(card.getBoundingClientRect().bottom),
              footerTop: Math.round(f.top - r.top),
              footerBottom: Math.round(f.bottom),
              artTop: Math.round(art.top - r.top),
              // Raw (unrounded) measurements: with fractional grid column widths the 4:3
              // aspect-ratio box height is fractional and may round to different integers.
              artH: art.height,
              artW: art.width,
              clipped:
                cue.scrollHeight > cue.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1,
              cueLines: Math.round(cue.getBoundingClientRect().height / lh),
            });
          }
          return out;
        });
        expect(rows).toHaveLength(10);
        // Group by grid row (same top) and require identical geometry inside each row.
        const byRow = new Map<number, typeof rows>();
        for (const r of rows) byRow.set(r.top, [...(byRow.get(r.top) ?? []), r]);
        for (const group of byRow.values()) {
          const first = group[0]!;
          for (const r of group) {
            expect(r.h).toBe(first.h);
            expect(r.footerTop).toBe(first.footerTop);
            expect(r.artTop).toBe(first.artTop);
            // Art height may differ by at most 1 CSS px (sub-pixel layout of fractional
            // column widths); card/footer/art-top alignment above stays exact.
            expect(Math.abs(r.artH - first.artH)).toBeLessThanOrEqual(1);
            // Media stays 4:3 (height = width * 3/4) within the same 1px bound.
            expect(Math.abs(r.artH - (r.artW * 3) / 4)).toBeLessThanOrEqual(1);
            expect(r.clipped).toBe(false);
          }
        }
        if (vp.name === 'desktop') expect(byRow.size).toBeLessThanOrEqual(4); // 3 columns
        if (vp.name === 'mobile') expect(byRow.size).toBe(10); // 1 column
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(over).toBeLessThanOrEqual(1);
      });
    }
  }

  test('theme choice persists across reload and navigation (shared with profile picker)', async ({
    page,
  }) => {
    await page.goto('/lab/visual-mnemonic');
    await page.getByTestId('mnemonic-theme-dark').click();
    expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('mnemonic-theme-dark')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('mnemonic-theme-system').click();
    expect(await page.evaluate(() => localStorage.getItem('mandarin.theme'))).toBeNull();
  });
});
