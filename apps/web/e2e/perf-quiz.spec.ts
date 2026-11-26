import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

/**
 * P4 (docs/PERFORMANCE.md): local quiz answer feedback — option click → correct/wrong shown (rAF
 * after the DOM update) — p95 < 100 ms OFFLINE with dataset D-L (12 000 review cards) on
 * `mobile-mid` (Chromium, CPU 4× slower). Grading is synchronous in the UI; persistence follows in
 * the background chain, so the measurement also proves answering does not wait on IndexedDB.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'CPU throttling needs Chromium (CDP)');
test.beforeEach(() => {
  test.skip(
    !test.info().project.name.endsWith('mobile'),
    'measured once, on the mobile-mid profile',
  );
});

const SKILL = 'meaning';

/** Dataset D-L (review part): 12 000 cards, deterministic, spread over due days. */
async function seedCards(page: Page, user: string, realItemIds: string[]) {
  await page.evaluate(
    ({ u, ids, skill }) =>
      new Promise<void>((resolve, reject) => {
        const today = new Date();
        const iso = (offset: number) => {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
          const p = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        };
        const req = indexedDB.open(`mandarin-ai:${u}`);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('cards', 'readwrite');
          const store = tx.objectStore('cards');
          const put = (id: string, due: string, box: number) =>
            store.put({
              key: `${id}|${skill}`,
              vocabularyItemId: id,
              skill,
              box,
              due,
              reps: box,
              lapses: 0,
              lastStudyDate: iso(-3),
              lastCorrect: true,
            });
          // 3 000 words × 4 skills = 12 000 cards (D-L); the saved words' meaning cards are the most overdue.
          const skills = ['meaning', 'reading', 'listening', 'writing'];
          for (let w = 0; w < 3000; w++)
            for (const s of skills) {
              const id = `dl-${String(w).padStart(5, '0')}-aaaa`;
              store.put({
                key: `${id}|${s}`,
                vocabularyItemId: id,
                skill: s,
                box: 1 + (w % 6),
                due: iso((w % 40) - 20),
                reps: 1 + (w % 6),
                lapses: 0,
                lastStudyDate: iso(-3),
                lastCorrect: true,
              });
            }
          for (const id of ids) put(id, iso(-30), 1); // oldest due: first in the indexed due query
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { u: user, ids: realItemIds, skill: SKILL },
  );
}

test('P4: quiz answer feedback p95 < 100 ms offline on D-L (12 000 cards), CPU 4× slower', async ({
  page,
  context,
}, info) => {
  test.slow();
  const user = crypto.randomUUID();
  await signIn(page, user);
  await page.goto('/library');
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('main') ?? {}).some((k) => k.startsWith('__react')),
  );
  await page.getByTestId('lesson-link').filter({ hasText: 'Ngày tháng, giờ giấc' }).click();
  await page.getByTestId('lesson-add-all').click();
  await expect(page.getByTestId('lesson-progress')).toHaveText('7/7 từ đã có');

  const itemIds = await page.evaluate(
    (u) =>
      new Promise<string[]>((resolve, reject) => {
        const req = indexedDB.open(`mandarin-ai:${u}`);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const all = db.transaction('vocab', 'readonly').objectStore('vocab').getAllKeys();
          all.onsuccess = () => {
            db.close();
            resolve(all.result as string[]);
          };
        };
      }),
    user,
  );
  expect(itemIds.length).toBe(7);

  const cdp = await page.context().newCDPSession(page);
  const durations: number[] = [];
  let startupMs = 0;
  for (let round = 0; round < 6; round++) {
    await page.goto('/practice');
    await seedCards(page, user, itemIds);
    await page.reload();
    // The indexed due query counts the saved words plus the synthetic D-L cards due today or earlier.
    await expect
      .poll(async () => Number(await page.getByTestId('quiz-due-count').textContent()))
      .toBeGreaterThanOrEqual(7);
    await context.setOffline(true);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await page.getByTestId('quiz-start-due').click();
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    startupMs = Math.max(startupMs, Date.now() - t0);

    for (let guard = 0; guard < 20; guard++) {
      if (await page.getByTestId('quiz-summary').isVisible()) break;
      await expect(page.getByTestId('quiz-option').first()).toBeEnabled();
      await page.waitForTimeout(150); // let the key/click handlers attach after render
      const ms = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const option = document.querySelector<HTMLElement>('[data-testid="quiz-option"]')!;
            const start = performance.now();
            option.click(); // React flushes a discrete click synchronously; next frame shows it
            requestAnimationFrame(() => {
              const shown = document.querySelector('[data-testid="quiz-feedback"]');
              resolve(shown ? performance.now() - start : -1);
            });
          }),
      );
      expect(ms, 'feedback must be visible in the next frame').toBeGreaterThanOrEqual(0);
      durations.push(ms);
      await page.getByTestId('quiz-next').click();
      // The final question transitions to summary asynchronously after durable persistence.
      // Wait for either the next enabled question or the summary, not the disabled old option.
      await expect
        .poll(async () => {
          const summary = await page.getByTestId('quiz-summary').count();
          const nextQuestion = await page.locator('[data-testid="quiz-option"]:enabled').count();
          return summary > 0 || nextQuestion > 0;
        })
        .toBe(true);
    }
    await expect(page.getByTestId('quiz-summary')).toBeVisible();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await context.setOffline(false);
    await page.getByTestId('quiz-done').click();
    await expect(page.getByTestId('quiz-summary')).toHaveCount(0); // session cleared before the next round
    await expect(page.getByTestId('quiz-start-due')).toBeVisible();
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1]!;
  const p50 = sorted[Math.floor(sorted.length / 2)]!;
  await info.attach('p4-quiz.json', {
    body: JSON.stringify({ p50, p95, n: durations.length, startupMs, durations }, null, 2),
    contentType: 'application/json',
  });
  console.log(
    `P4 quiz (D-L 12k cards, offline, CPU 4×): n ${durations.length} · p50 ${p50.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms · start ${startupMs} ms`,
  );
  expect(durations.length, 'enough samples for a p95').toBeGreaterThanOrEqual(30);
  expect(p95, 'P4 p95 (ms)').toBeLessThan(100);
});
