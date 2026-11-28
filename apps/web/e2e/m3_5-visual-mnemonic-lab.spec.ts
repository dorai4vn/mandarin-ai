import { expect, test, type Page } from '@playwright/test';

/** Wait until every gallery image has loaded (lazy images forced eager) and return broken count. */
async function brokenImages(page: Page) {
  return page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('main img'));
    imgs.forEach((i) => (i.loading = 'eager'));
    await Promise.all(
      imgs.map((i) =>
        i.complete
          ? Promise.resolve()
          : new Promise((r) => {
              i.onload = i.onerror = () => r(null);
            }),
      ),
    );
    return imgs.filter((i) => !i.complete || i.naturalWidth !== 1600 || i.naturalHeight !== 1200)
      .length;
  });
}

test.describe('M3.5 visual mnemonic QC lab', () => {
  test('artwork shown by default: 246 active primary, 4 archive separate, all unapproved', async ({
    page,
  }) => {
    await page.goto('/lab/visual-mnemonic');
    // No checkbox gating, no pilot-first layout, no placeholders.
    await expect(page.getByTestId('mnemonic-preview-toggle')).toHaveCount(0);
    await expect(page.getByTestId('mnemonic-art-pending')).toHaveCount(0);
    await expect(page.getByTestId('mnemonic-lab-card-山')).toHaveCount(0);

    const active = page.getByTestId('artwork-qc-grid').locator('li');
    const archive = page.getByTestId('artwork-qc-archive-grid').locator('li');
    await expect(active).toHaveCount(246);
    await expect(archive).toHaveCount(4);
    await expect(page.locator('[data-group="active"]')).toHaveCount(246);
    await expect(page.locator('[data-group="archive"]')).toHaveCount(4);
    // Archive section comes after the primary active gallery.
    const [aBox, bBox] = await Promise.all([
      page.getByTestId('artwork-qc-gallery').boundingBox(),
      page.getByTestId('artwork-qc-archive').boundingBox(),
    ]);
    expect(bBox!.y).toBeGreaterThan(aBox!.y + aBox!.height - 1);

    // Owner gate: everything labelled unapproved, nothing approved.
    await expect(page.getByTestId('artwork-qc-note')).toContainText('chưa duyệt');
    await expect(page.getByTestId('mnemonic-lab-summary')).toContainText('0 đã duyệt');
    await expect(page.getByTestId('mnemonic-lab-summary')).toContainText('chưa có ảnh nào');
    await expect(page.getByTestId('mnemonic-lab-notice')).toContainText('không phải bằng chứng');
    await expect(page.getByTestId('artwork-qc-badge')).toHaveCount(250);
    await expect(
      page.locator('[data-status="approved"], [data-status="artwork-approved"]'),
    ).toHaveCount(0);
    await expect(page.locator('main img[src^="/mnemonic/"]')).toHaveCount(0);

    expect(await brokenImages(page)).toBe(0);
  });

  test('pilot glyph candidates (人/雨) render real images, not placeholders', async ({ page }) => {
    await page.goto('/lab/visual-mnemonic');
    for (const g of ['人', '雨']) {
      const img = page.getByTestId(`artwork-qc-${g}`).locator('img');
      await expect(img).toHaveAttribute('src', /^\/mnemonic-candidates\/.+\.webp$/);
    }
  });

  test('no local theme controls; inherits global theme only', async ({ page }) => {
    await page.goto('/lab/visual-mnemonic');
    await expect(page.getByTestId('mnemonic-theme-controls')).toHaveCount(0);
    await expect(page.locator('[data-testid^="mnemonic-theme-"]')).toHaveCount(0);
  });

  const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 800, cols: 2 },
    { name: 'tablet', width: 768, height: 900, cols: 3 },
    { name: 'desktop', width: 1280, height: 900, cols: 4 },
  ];
  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`global ${theme} theme, aligned 4:3 thumbnails, no overflow: ${vp.name}`, async ({
        page,
      }) => {
        await page.addInitScript((t) => localStorage.setItem('mandarin.theme', t), theme);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/lab/visual-mnemonic');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.getByTestId('artwork-qc-山')).toBeVisible();

        const rows = await page.evaluate(() =>
          Array.from(
            document.querySelectorAll<HTMLElement>('[data-testid="artwork-qc-grid"] > li'),
          ).map((li) => {
            const r = li.getBoundingClientRect();
            const art = li
              .querySelector<HTMLElement>('[data-testid="artwork-qc-art"]')!
              .getBoundingClientRect();
            return {
              top: Math.round(r.top + window.scrollY),
              h: Math.round(r.height),
              artTop: Math.round(art.top - r.top),
              artH: art.height,
              artW: art.width,
              clipped: li.scrollWidth > li.clientWidth + 1,
            };
          }),
        );
        expect(rows).toHaveLength(246);
        const byRow = new Map<number, typeof rows>();
        for (const r of rows) byRow.set(r.top, [...(byRow.get(r.top) ?? []), r]);
        expect(byRow.size).toBe(Math.ceil(246 / vp.cols));
        for (const group of byRow.values()) {
          const first = group[0]!;
          for (const r of group) {
            expect(r.h).toBe(first.h);
            expect(r.artTop).toBe(first.artTop);
            expect(Math.abs(r.artH - (r.artW * 3) / 4)).toBeLessThanOrEqual(1);
            expect(r.clipped).toBe(false);
          }
        }
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(over).toBeLessThanOrEqual(1);
      });
    }
  }
});
