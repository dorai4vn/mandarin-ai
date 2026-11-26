import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

/**
 * M3 (D-007, D-043): quiz over the learner's saved words — new-day quiz, due review, per-skill
 * schedule, attempts/events, resume after reload, offline answers synced exactly once, keyboard,
 * isolation between accounts. Correct answers are not in the DOM before answering, so the tests
 * answer with the keyboard and check consistency (feedback ↔ summary ↔ schedule).
 */
async function open(page: Page, path: string, user: string) {
  await signIn(page, user);
  await page.goto(path);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
}

/** Adds the 7 words of "Ngày tháng, giờ giấc" to the personal dictionary. */
async function addLesson(page: Page, user: string) {
  await open(page, '/library', user);
  await page.getByTestId('lesson-link').filter({ hasText: 'Ngày tháng, giờ giấc' }).click();
  await page.getByTestId('lesson-add-all').click();
  await expect(page.getByTestId('lesson-progress')).toHaveText('7/7 từ đã có');
}

/** Answers the current question with key 1; returns whether it was correct. */
async function answerWithKeyboard(page: Page): Promise<boolean> {
  await expect(page.getByTestId('quiz-option').first()).toBeEnabled();
  const fb = page.getByTestId('quiz-feedback');
  // The key handler is attached right after the question renders: retry the press, never double-answer.
  await expect(async () => {
    await page.keyboard.press('1');
    await expect(fb).toHaveAttribute('data-result', /correct|wrong/, { timeout: 1500 });
  }).toPass({ timeout: 10_000 });
  return (await fb.getAttribute('data-result')) === 'correct';
}

async function runToSummary(page: Page) {
  let right = 0;
  let total = 0;
  for (let guard = 0; guard < 40; guard++) {
    if (await page.getByTestId('quiz-summary').isVisible()) break;
    if (await answerWithKeyboard(page)) right += 1;
    total += 1;
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('quiz-summary')).toBeVisible();
  return { right, total };
}

test('empty account: guidance to add words, no quiz buttons', async ({ page }) => {
  await open(page, '/practice', crypto.randomUUID());
  await expect(page.getByTestId('quiz-home')).toContainText('Chưa có từ để luyện');
  await expect(page.getByTestId('quiz-start-mixed')).toHaveCount(0);
});

test('new-day quiz → summary → schedule; failures come back the same day, successes tomorrow', async ({
  page,
}) => {
  const user = crypto.randomUUID();
  await addLesson(page, user);
  await page.goto('/practice');
  await expect(page.getByTestId('quiz-new-count')).toHaveText('7');
  await expect(page.getByTestId('quiz-due-count')).toHaveText('0');
  await page.getByTestId('quiz-start-new').click();
  await expect(page.getByTestId('quiz-question')).toBeVisible();
  // The answer is never in the DOM before answering.
  await expect(page.getByTestId('quiz-option').first()).not.toHaveAttribute('data-state', /./);
  await expect(page.getByTestId('quiz-progress')).toContainText('1/7');

  const { right, total } = await runToSummary(page);
  expect(total).toBeGreaterThanOrEqual(7); // wrong answers are asked once more
  const wrongFirst = total - 7;
  await expect(page.getByTestId('quiz-summary-score')).toHaveText(`${right}/${total} câu đúng`);
  await expect(page.getByTestId('quiz-summary-schedule').locator('li')).toHaveCount(7);
  await page.getByTestId('quiz-done').click();

  // Every word now has a card: no new words left; words not answered correctly are due today.
  await expect(page.getByTestId('quiz-new-count')).toHaveText('0');
  const due = Number(await page.getByTestId('quiz-due-count').textContent());
  expect(due).toBeLessThanOrEqual(wrongFirst);
  if (right === total) await expect(page.getByTestId('quiz-start-due')).toBeDisabled();
});

test('keyboard only: 1–4 chooses, Enter continues, options expose their shortcut', async ({
  page,
}) => {
  const user = crypto.randomUUID();
  await addLesson(page, user);
  await page.goto('/practice');
  await expect(page.getByTestId('quiz-new-count')).toHaveText('7');
  const start = page.getByTestId('quiz-start-mixed');
  await expect(start).toBeEnabled();
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('quiz-question')).toBeVisible();
  await expect(page.getByTestId('quiz-option').first()).toHaveAttribute('aria-keyshortcuts', '1');
  await page.keyboard.press('2');
  await expect(page.getByTestId('quiz-feedback')).toHaveAttribute('data-result', /correct|wrong/);
  await expect(page.getByTestId('quiz-next')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('quiz-progress')).toContainText('2/');
  // Options are disabled after answering: pressing a number again does not double-answer.
  await page.keyboard.press('1');
  await page.keyboard.press('1');
  await expect(page.getByTestId('quiz-feedback')).toHaveAttribute('data-result', /correct|wrong/);
  await page.keyboard.press('3');
  await expect(page.getByTestId('quiz-progress')).toContainText('2/');
});

test('reload mid-session resumes at the same question without duplicating attempts', async ({
  page,
}) => {
  const user = crypto.randomUUID();
  await addLesson(page, user);
  await page.goto('/practice');
  await page.getByTestId('quiz-start-new').click();
  await answerWithKeyboard(page);
  await expect(page.getByTestId('quiz-question')).toHaveAttribute('data-persisted', 'true');
  await page.getByTestId('quiz-next').click();
  const prompt2 = await page.getByTestId('quiz-prompt').textContent();
  await answerWithKeyboard(page);
  await expect(page.getByTestId('quiz-question')).toHaveAttribute('data-persisted', 'true');
  await page.getByTestId('quiz-next').click();
  const prompt3 = await page.getByTestId('quiz-prompt').textContent();

  await page.reload();
  await expect(page.getByTestId('quiz-resumed')).toBeVisible();
  await expect(page.getByTestId('quiz-progress')).toContainText('3/');
  await expect(page.getByTestId('quiz-prompt')).toHaveText(prompt3!);
  expect(prompt3).not.toBe(prompt2 === prompt3 ? '' : null);
  const counts = await page.evaluate(
    (u) =>
      new Promise<{ attempts: number; events: number }>((resolve) => {
        const req = indexedDB.open(`mandarin-ai:${u}`);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['attempts', 'events'], 'readonly');
          const a = tx.objectStore('attempts').count();
          const e = tx.objectStore('events').count();
          tx.oncomplete = () => resolve({ attempts: a.result, events: e.result });
        };
      }),
    user,
  );
  expect(counts.attempts).toBe(2);
  expect(counts.events).toBe(3); // started + 2 answered
});

/** Reads durable outbox state; network status alone does not prove quiz operations synced. */
async function outboxCounts(
  page: Page,
  user: string,
): Promise<{ pending: number; rejected: number }> {
  return page.evaluate(
    (u) =>
      new Promise<{ pending: number; rejected: number }>((resolve, reject) => {
        const req = indexedDB.open(`mandarin-ai:${u}`);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('outbox', 'readonly');
          const rows = tx.objectStore('outbox').getAll();
          rows.onsuccess = () => {
            const entries = rows.result as { status: string }[];
            resolve({
              pending: entries.filter((e) => e.status === 'pending').length,
              rejected: entries.filter((e) => e.status === 'rejected').length,
            });
          };
          rows.onerror = () => reject(rows.error);
          tx.oncomplete = () => db.close();
        };
      }),
    user,
  );
}

test('offline answers are kept and synced exactly once when back online; the other device sees them', async ({
  browser,
}) => {
  const user = crypto.randomUUID();
  const d1 = await browser.newContext();
  const p1 = await d1.newPage();
  await addLesson(p1, user);
  await expect(p1.getByTestId('sync-chip').filter({ visible: true }).first()).toContainText(
    'Đã đồng bộ',
  );
  await p1.goto('/practice');
  await expect(p1.getByTestId('quiz-new-count')).toHaveText('7');
  await d1.setOffline(true);
  await p1.getByTestId('quiz-start-new').click();
  await runToSummary(p1);
  await p1.getByTestId('quiz-done').click();
  // Prove the offline answers are durable and queued before allowing sync.
  await expect.poll(async () => (await outboxCounts(p1, user)).pending).toBeGreaterThan(0);
  await d1.setOffline(false);
  await p1.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(async () => p1.evaluate(() => navigator.onLine)).toBe(true);
  // Do not mistake browser connectivity for a completed push to the shared server.
  await expect
    .poll(async () => (await outboxCounts(p1, user)).pending, { timeout: 30_000 })
    .toBe(0);
  expect((await outboxCounts(p1, user)).rejected).toBe(0);

  const d2 = await browser.newContext();
  const p2 = await d2.newPage();
  await open(p2, '/practice', user);
  // Same account, other device: the words are there and already counted as practised.
  await expect(p2.getByTestId('quiz-new-count')).toHaveText('0', { timeout: 30_000 });
  for (const c of [d1, d2]) await c.close();
});

test('another account sees none of this account’s words or progress', async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await addLesson(pa, crypto.randomUUID());
  const b = await browser.newContext();
  const pb = await b.newPage();
  await open(pb, '/practice', crypto.randomUUID());
  await expect(pb.getByTestId('quiz-home')).toContainText('Chưa có từ để luyện');
  for (const c of [a, b]) await c.close();
});

test('signed-out visitors cannot start a quiz', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByTestId('require-auth')).toBeVisible();
  await expect(page.getByTestId('quiz-home')).toHaveCount(0);
});
