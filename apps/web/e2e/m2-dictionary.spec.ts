import { expect, test, type Page } from '@playwright/test';
import { deviceClass, expectNoHorizontalScroll, signIn } from './helpers';

/**
 * M2 (PRD-01/02/11, D-043): personal dictionary on the shared lexicon, manual entry with
 * duplicate linking, notes/tags, lessons from the starter course, offline reading of downloaded
 * content, and the same words on two devices of one account.
 */
async function open(page: Page, path = '/dictionary', user?: string) {
  await signIn(page, user);
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}
const rows = (page: Page) => page.getByTestId('dictionary-row');

test('search finds 山 via 山, shan1, shān and núi; add it, write notes and tags', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId('dictionary-empty')).toBeVisible();
  const search = page.getByTestId('dictionary-search');
  for (const q of ['山', 'shan1', 'shān', 'núi', 'nui']) {
    await search.fill(q);
    await expect(rows(page).first(), q).toContainText('山');
  }
  await rows(page).first().click();
  const detail = page.getByTestId('word-detail');
  await expect(detail.getByTestId('word-hanzi')).toHaveText('山');
  await expect(detail).toContainText('Ngọn núi này rất cao.');
  await expect(detail.getByTestId('word-lessons')).toContainText('Thiên nhiên');
  await detail.getByTestId('word-add').click();
  await expect(detail).toContainText('Trong từ của tôi');
  await detail.getByTestId('word-notes').fill('Giống ba đỉnh núi');
  await detail.getByTestId('word-tags').fill('HSK1, thiên nhiên');
  await detail.getByTestId('word-save').click();
  await expect(page.getByTestId('toast-region')).toContainText('Đã lưu');

  await page.reload();
  await search.fill('');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Của tôi');
  await rows(page).first().click();
  await expect(page.getByTestId('word-notes')).toHaveValue('Giống ba đỉnh núi');
  await expect(page.getByTestId('word-personal')).toContainText('HSK1');
  await expect(page.getByTestId('word-additions')).toContainText('Từ từ điển');
  // The example's translation is still shown for a word copied from the shared lexicon.
  await expect(page.getByTestId('word-detail')).toContainText('Ngọn núi này rất cao.');
  await expectNoHorizontalScroll(page);
});

test('manual entry: numbered pinyin, suggests the shared lexeme, duplicates link instead', async ({
  page,
}) => {
  await open(page);
  await page.getByTestId('add-word-open').click();
  const dialog = page.getByTestId('add-word-dialog');
  await dialog.getByTestId('add-word-hanzi').fill('学习');
  await dialog.getByTestId('add-word-pinyin').fill('xue2 xi2');
  await dialog.getByTestId('add-word-meaning').fill('học tập');
  await dialog.getByTestId('add-word-save').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('word-detail')).toContainText('xué xí');
  await expect(page.getByTestId('word-detail')).toContainText('học tập');

  // A word that exists in the shared lexicon: the app suggests it, never overwrites silently.
  await page.getByTestId('add-word-open').click();
  await dialog.getByTestId('add-word-hanzi').fill('水');
  await expect(dialog.getByTestId('add-word-suggestion')).toContainText('nước');
  await expect(dialog.getByTestId('add-word-pinyin')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Dùng mục này' }).click();
  await expect(dialog.getByTestId('add-word-pinyin')).toHaveValue('shuǐ');
  await dialog.getByTestId('add-word-save').click();
  await expect(page.getByTestId('word-lessons')).toContainText('Thiên nhiên'); // linked lexeme

  // Same word again → linked to the existing entry, not duplicated.
  await page.getByTestId('add-word-open').click();
  await dialog.getByTestId('add-word-hanzi').fill('水');
  await dialog.getByTestId('add-word-pinyin').fill('shui3');
  await dialog.getByTestId('add-word-meaning').fill('nước');
  await dialog.getByTestId('add-word-save').click();
  await expect(page.getByTestId('toast-region')).toContainText('đã có trong danh sách');
  await page.getByTestId('dictionary-search').fill('');
  // Phone shows the detail instead of the list: go back to it first.
  const back = page.getByRole('button', { name: /Danh sách/ });
  if (await back.isVisible()) await back.click();
  await expect(rows(page)).toHaveCount(2);

  // Searching for a missing Hanzi pre-fills the add dialog with it.
  await page.getByTestId('dictionary-search').fill('龙');
  await page.getByTestId('add-word-open').click();
  await expect(dialog.getByTestId('add-word-hanzi')).toHaveValue('龙');
  await dialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByTestId('dictionary-search').fill('');

  // Validation: required fields.
  await page.getByTestId('add-word-open').click();
  await dialog.getByTestId('add-word-save').click();
  await expect(dialog).toContainText('Hãy nhập chữ Hán.');
});

test('lessons: add a whole lesson; a word shared by two lessons stays one entry', async ({
  page,
}) => {
  await open(page, '/library');
  await expect(page.getByTestId('course-list')).toContainText('Khởi động tiếng Trung');
  await page.getByTestId('lesson-link').filter({ hasText: 'Ngày tháng, giờ giấc' }).click();
  await expect(page.getByTestId('lesson-title')).toHaveText('Ngày tháng, giờ giấc');
  await page.getByTestId('lesson-add-all').click();
  await expect(page.getByTestId('lesson-progress')).toHaveText('7/7 từ đã có');
  await expect(page.getByTestId('lesson-add-all')).toBeDisabled();

  // 天 is also in "Thiên nhiên": adding that lesson links 天 instead of duplicating it.
  await page.goto('/library/lesson?id=ls-3-1');
  await expect(page.getByTestId('lesson-progress')).toHaveText('1/7 từ đã có');
  await page.getByTestId('lesson-add-all').click();
  await expect(page.getByTestId('toast-region')).toContainText('1 từ đã có được liên kết');
  await page.goto('/dictionary');
  await page.getByTestId('dictionary-search').fill('天');
  await expect(
    rows(page).filter({ hasText: 'Của tôi' }).filter({ hasText: 'ngày; trời' }),
  ).toHaveCount(1);
  await rows(page).filter({ hasText: 'ngày; trời' }).first().click();
  const additions = page.getByTestId('word-additions');
  await expect(additions).toContainText('Ngày tháng, giờ giấc');
  await expect(additions).toContainText('Thiên nhiên');
});

test('downloaded content is read from the device when the server is unreachable', async ({
  page,
}) => {
  const user = crypto.randomUUID();
  await open(page, '/dictionary', user);
  await page.getByTestId('dictionary-search').fill('shui');
  await expect(rows(page).first()).toContainText('水');
  // Second visit: content API unreachable — the cached snapshot still answers.
  await page.route('**/v1/content**', (r) => r.abort());
  await page.reload();
  await page.getByTestId('dictionary-search').fill('nước');
  await expect(rows(page).first()).toContainText('水');
});

test('words added on one device appear on the other device of the same account', async ({
  browser,
}) => {
  const user = crypto.randomUUID();
  const d1 = await browser.newContext();
  const d2 = await browser.newContext();
  const p1 = await d1.newPage();
  await open(p1, '/dictionary', user);
  await p1.getByTestId('dictionary-search').fill('茶');
  await p1.getByTestId('dictionary-row').first().click();
  await p1.getByTestId('word-add').click();
  await expect(p1.getByTestId('word-detail')).toContainText('Trong từ của tôi');
  await expect(p1.getByTestId('sync-chip').filter({ visible: true }).first()).toContainText(
    'Đã đồng bộ',
  );

  const p2 = await d2.newPage();
  await open(p2, '/dictionary', user);
  await expect(rows(p2).filter({ hasText: 'Của tôi' })).toHaveCount(1);
  await expect(rows(p2).first()).toContainText('茶');
  for (const c of [d1, d2]) await c.close();
});

test('phone: list then detail with a way back', async ({ page }) => {
  test.skip(deviceClass(page) !== 'phone', 'phone layout');
  await open(page);
  await page.getByTestId('dictionary-search').fill('shan');
  await rows(page).first().click();
  await expect(page.getByTestId('dictionary-results')).toBeHidden();
  await page.getByRole('button', { name: /Danh sách/ }).click();
  await expect(page.getByTestId('dictionary-results')).toBeVisible();
});
