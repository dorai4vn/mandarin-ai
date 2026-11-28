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

  test('remediation status + filters for the 53 FAIL/UNCERTAIN, nothing promoted or hidden', async ({
    page,
  }) => {
    await page.goto('/lab/visual-mnemonic');
    const grid = page.getByTestId('artwork-qc-grid');
    await expect(grid.locator('li')).toHaveCount(246);
    await expect(grid.locator('li[data-audit="PASS"]')).toHaveCount(193);
    await expect(grid.locator('li[data-audit="UNCERTAIN"]')).toHaveCount(44);
    await expect(grid.locator('li[data-audit="FAIL"]')).toHaveCount(9);
    await expect(page.getByTestId('artwork-qc-remediation')).toHaveCount(53);
    await expect(grid.locator('li[data-remediation="contextual-card"]')).toHaveCount(42);
    await expect(grid.locator('li[data-remediation="counting-diagram"]')).toHaveCount(7);
    await expect(grid.locator('li[data-remediation="contrast-card"]')).toHaveCount(3);
    await expect(grid.locator('li[data-remediation="replace-brief"]')).toHaveCount(0);
    await expect(grid.locator('li[data-remediation="retain-with-caption"]')).toHaveCount(1);
    await expect(page.getByTestId('artwork-qc-card')).toHaveCount(52);
    // Deterministic SVG counting diagrams show the exact dot count; rejected images are audit-only.
    const dots: [string, number][] = [
      ['五', 5],
      ['六', 6],
      ['九', 9],
      ['十', 10],
    ];
    for (const [h, n] of dots) {
      const d = page.getByTestId(`artwork-qc-${h}`).getByTestId('artwork-qc-diagram');
      await expect(d).toHaveAttribute('role', 'img');
      await expect(d).toHaveAttribute('data-dot-count', String(n));
      await expect(d.locator('circle[data-dot]')).toHaveCount(n);
      await expect(page.getByTestId(`artwork-qc-${h}`).locator('img')).toHaveCount(1);
      await expect(
        page.getByTestId(`artwork-qc-${h}`).getByTestId('artwork-qc-audit-only'),
      ).toBeVisible();
    }
    // Owner-clarified flexible concepts: labelled fictional banknotes, scoreboard, calendar, rental sign.
    const visual = (h: string) =>
      page.getByTestId(`artwork-qc-${h}`).getByTestId('artwork-qc-visual');
    await expect(visual('百').locator('[data-banknote="100"]')).toHaveCount(1);
    await expect(visual('千').locator('[data-banknote="100"]')).toHaveCount(10);
    await expect(visual('千')).toContainText('1000');
    await expect(visual('零')).toContainText('0');
    await expect(visual('零').locator('text')).toHaveCount(3);
    await expect(visual('今').locator('[data-day="今天"]')).toHaveAttribute('data-active', 'true');
    await expect(visual('昨').locator('[data-day="昨天"]')).toHaveAttribute('data-active', 'true');
    await expect(visual('租').locator('[data-sign="出租"]')).toHaveCount(1);
    for (const h of ['百', '千', '零', '今', '昨', '租']) {
      await expect(visual(h)).toHaveAttribute('role', 'img');
      await expect(
        page.getByTestId(`artwork-qc-${h}`).getByTestId('artwork-qc-audit-only'),
      ).toBeVisible();
    }
    await expect(
      page.getByTestId('artwork-qc-今').getByTestId('artwork-qc-contrast'),
    ).toContainText('昨天');
    await expect(
      page.getByTestId('artwork-qc-租').getByTestId('artwork-qc-contrast'),
    ).toContainText('买房子');
    await expect(
      page.getByTestId('artwork-qc-说').getByTestId('artwork-qc-audit-only'),
    ).toHaveCount(0);
    // 的 (FAIL) shows a teaching card, its candidate image stays, still unapproved.
    const de = page.getByTestId('artwork-qc-的');
    await expect(de.getByTestId('artwork-qc-card')).toContainText('这是我的书');
    await expect(de.locator('img')).toHaveCount(1);
    await expect(de.getByTestId('artwork-qc-badge')).toContainText('chưa duyệt');

    const counts: [string, number][] = [
      ['pass', 193],
      ['review', 53],
      ['contextual-card', 42],
      ['counting-diagram', 7],
      ['contrast-card', 3],
      ['retain-with-caption', 1],
    ];
    for (const [id, n] of counts) {
      await page.getByTestId(`artwork-qc-filter-${id}`).click();
      await expect(page.getByTestId(`artwork-qc-filter-${id}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(grid.locator('li')).toHaveCount(n);
      // Archive section and unapproved summary are unaffected by the filter.
      await expect(page.getByTestId('artwork-qc-archive-grid').locator('li')).toHaveCount(4);
      await expect(page.getByTestId('mnemonic-lab-summary')).toContainText('0 đã duyệt');
    }
    await page.getByTestId('artwork-qc-filter-all').click();
    await expect(grid.locator('li')).toHaveCount(246);
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
