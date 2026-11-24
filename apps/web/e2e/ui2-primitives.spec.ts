import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { expectNoHorizontalScroll, screenshot } from './helpers';

/**
 * UI-2 component primitives — checked on the gallery /lab/design (UI_MIGRATION_PLAN §6/§8:
 * axe 0 serious/critical, every control has an accessible name, touch targets ≥ 44).
 */
const GALLERY = '/lab/design';

async function open(page: import('@playwright/test').Page) {
  await page.goto(GALLERY);
  await expect(page.getByTestId('design-gallery')).toBeVisible();
  // Interactions need hydration (React attaches handlers to <main>'s subtree).
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}

test('gallery: no serious/critical axe violations (WCAG 2.2 A/AA)', async ({ page }, info) => {
  await open(page);
  const result = await new AxeBuilder({ page })
    .include('[data-testid="design-gallery"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
    [],
  );
  await screenshot(page, info, 'ui2-gallery');
});

test('gallery: no horizontal scroll at 320 px and at the project viewport', async ({ page }) => {
  await open(page);
  await expectNoHorizontalScroll(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await expectNoHorizontalScroll(page);
});

test('touch targets ≥ 44 px; every control has an accessible name', async ({ page }) => {
  await open(page);
  const controls = page
    .getByTestId('design-gallery')
    .locator('button, a[href], input:not([type=hidden]), textarea');
  const n = await controls.count();
  expect(n).toBeGreaterThan(20);
  for (let i = 0; i < n; i++) {
    const el: Locator = controls.nth(i);
    const box = await el.boundingBox();
    if (!box) continue;
    const extended = (await el.getAttribute('data-touch')) === 'extended';
    // sm controls are 36 px but extend their hit area to 44 with an invisible ::before.
    const height = extended
      ? await el.evaluate((node) => {
          const before = getComputedStyle(node, '::before');
          return (
            node.getBoundingClientRect().height - parseFloat(before.top) - parseFloat(before.bottom)
          );
        })
      : box.height;
    expect(height, `${await el.evaluate((x) => x.outerHTML.slice(0, 80))}`).toBeGreaterThanOrEqual(
      44,
    );
    const name = await el.evaluate((node) => {
      const n = node as HTMLElement;
      const labelled = (n as HTMLInputElement).labels?.[0]?.textContent;
      return (n.getAttribute('aria-label') ?? labelled ?? n.textContent ?? '').trim();
    });
    expect(name.length, 'accessible name').toBeGreaterThan(0);
  }
});

test('buttons: focus ring on keyboard focus, disabled, loading blocks repeat', async ({ page }) => {
  await open(page);
  const primary = page.getByTestId('btn-primary');
  await primary.focus();
  // Keyboard focus → :focus-visible ring (2 px token colour, 2 px offset).
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(primary).toBeFocused();
  const ring = await primary.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset };
  });
  expect(ring).toEqual({ style: 'solid', width: '2px', offset: '2px' });

  await expect(page.getByTestId('btn-disabled')).toBeDisabled();

  const save = page.getByTestId('btn-loading');
  await expect(save).toHaveAttribute('data-clicks', '0');
  await save.click();
  await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(save).toContainText('Đang lưu');
  await expect(save).toHaveAttribute('data-clicks', '1');
  // A second click while loading must not run the handler again. Centre the button first: a
  // forced click uses coordinates, and on phones the fixed bottom nav may cover the button.
  await save.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await save.click({ force: true });
  await expect(save).toHaveAttribute('data-clicks', '1');
  await expect(save).not.toHaveAttribute('aria-busy', 'true', { timeout: 4000 });
  await expect(save).toContainText('Lưu (bấm thử)');
  await expect(save).toHaveAttribute('data-clicks', '1');

  // A loading submit button never submits its form: not by click, not by Enter (implicit submit).
  const form = page.getByTestId('loading-form');
  const submit = page.getByTestId('btn-loading-submit');
  await expect(submit).toHaveAttribute('aria-busy', 'true');
  await submit.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await submit.click({ force: true });
  await submit.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(form).toHaveAttribute('data-submits', '0');
});

test('form: label, hint and error are wired for assistive tech', async ({ page }) => {
  await open(page);
  const email = page.getByTestId('field-email');
  await expect(email).toHaveAccessibleName('Email');
  await expect(email).toHaveAccessibleDescription('Email được quản trị viên cấp.');

  const bad = page.getByTestId('field-error');
  await expect(bad).toHaveAttribute('aria-invalid', 'true');
  await expect(bad).toHaveAccessibleDescription('Email chưa đúng định dạng.');

  // A caller-provided id is kept AND still linked to the label and the hint.
  const own = page.locator('#ten-tai-lieu');
  await expect(own).toHaveAccessibleName(/Tên tài liệu/);
  await expect(own).toHaveAccessibleDescription('Ví dụ dùng id riêng.');
  await expect(page.locator('label[for="ten-tai-lieu"]')).toHaveCount(1);

  // Font size ≥ 16 px so iOS does not zoom on focus.
  expect(
    parseFloat(await email.evaluate((el) => getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
});

test('password input: show / hide toggle by mouse and keyboard', async ({ page }) => {
  await open(page);
  const pw = page.getByTestId('field-password');
  await expect(pw).toHaveAttribute('type', 'password');
  await expect(pw).toHaveAttribute('autocomplete', 'current-password');
  await pw.fill('mat-khau-vi-du');
  const toggle = page.getByRole('button', { name: 'Hiện mật khẩu', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(pw).toHaveAttribute('type', 'text');
  const hide = page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true });
  await expect(hide).toHaveAttribute('aria-pressed', 'true');
  await hide.focus();
  await page.keyboard.press('Space');
  await expect(pw).toHaveAttribute('type', 'password');
  await expect(pw).toHaveValue('mat-khau-vi-du');
});

test('search: clear button and Escape empty the field', async ({ page }) => {
  await open(page);
  const search = page.getByTestId('field-search');
  await expect(search).toHaveAccessibleName('Tìm trong từ điển');
  await expect(search).toHaveValue('nǐ hǎo');
  await page.getByRole('button', { name: 'Xóa nội dung tìm kiếm', exact: true }).click();
  await expect(search).toHaveValue('');
  // The clear button disappears with the text; keyboard focus returns to the field.
  await expect(search).toBeFocused();
  await search.fill('shān');
  await search.press('Escape');
  await expect(search).toHaveValue('');
});

test('study cards: one link per tile; "Sắp có" tiles are not links', async ({ page }) => {
  await open(page);
  const blue = page.getByTestId('study-blue');
  expect(await blue.evaluate((el) => el.tagName)).toBe('A');
  await expect(blue).toHaveAccessibleName(/Từ vựng mới/);
  expect(await blue.locator('a, button').count()).toBe(0);
  const soon = page.getByTestId('study-soon');
  expect(await soon.evaluate((el) => el.tagName)).toBe('DIV');
  await expect(soon).toContainText('Sắp có');
  await expect(soon).toHaveAttribute('aria-disabled', 'true');
  // Pastel colours come from the tokens measured on the reference.
  const bg = await blue.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(226, 237, 253)');
});

test('study cards stay inside their grid at 320 px (no overlap / clipping)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await open(page);
  const grid = page.getByTestId('gallery-study').locator('> div').first();
  const g = await grid.boundingBox();
  const cards = grid.locator('> *');
  expect(await cards.count()).toBe(3);
  const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (let i = 0; i < 3; i++) boxes.push((await cards.nth(i).boundingBox())!);
  const [a, b] = boxes as [(typeof boxes)[0], (typeof boxes)[0]];
  for (const b of boxes) expect(b.x + b.width).toBeLessThanOrEqual(g!.x + g!.width + 0.5);
  // Two columns on phones: the first two tiles sit side by side without overlapping.
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
  expect(a.y).toBe(b.y);
});

test('study card "Nghe hiểu" is lavender: colours, hover, keyboard focus, coming soon', async ({
  page,
}, testInfo) => {
  await open(page);
  const tile = page.getByTestId('study-lavender');
  await expect(tile).toHaveAccessibleName(/Nghe hiểu/);
  const colours = await tile.evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    icon: getComputedStyle(el.firstElementChild as Element).color,
  }));
  expect(colours).toEqual({ bg: 'rgb(240, 234, 254)', icon: 'rgb(130, 89, 221)' });

  // Hover lift + shadow only where hover exists (Tailwind 4 `hover:` = @media (hover: hover)).
  const hoverCapable = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  if (testInfo.project.name.endsWith('desktop')) expect(hoverCapable).toBe(true);
  if (hoverCapable) {
    expect(await tile.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
    await tile.hover();
    await expect.poll(() => tile.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
  }

  await tile.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(tile).toBeFocused();
  const ring = await tile.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).toBe('solid');

  // Coming-soon tile: same lavender, not a link, not focusable, says "Sắp có".
  const soon = page.getByTestId('study-lavender-soon');
  expect(await soon.evaluate((el) => el.tagName)).toBe('DIV');
  await expect(soon).toHaveAttribute('aria-disabled', 'true');
  await expect(soon).toContainText('Sắp có');
  expect(await soon.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(240, 234, 254)',
  );
  expect(await soon.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
});
