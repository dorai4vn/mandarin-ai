import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

/**
 * P2 (docs/PERFORMANCE.md): local dictionary lookup — input event → results rendered (rAF after
 * the DOM update) — p95 < 200 ms with dataset D-L (12 000 lexemes) on `mobile-mid` (Chromium,
 * CPU 4× slower). CPU throttling exists only in Chromium (CDP), so the gate runs there.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'CPU throttling needs Chromium (CDP)');
test.beforeEach(() => {
  test.skip(
    !test.info().project.name.endsWith('mobile'),
    'measured once, on the mobile-mid profile',
  );
});

const SYLLABLES = [
  'ma',
  'shan',
  'shui',
  'ren',
  'hao',
  'xue',
  'zhong',
  'guo',
  'tian',
  'di',
  'jia',
  'peng',
  'you',
  'chi',
  'fan',
  'cha',
  'lao',
  'shi',
  'mi',
  'qian',
  'xiang',
  'lai',
  'qu',
  'zai',
  'nian',
  'yue',
  'ri',
  'yu',
  'huo',
  'mu',
];
const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
};
const WORDS = [
  'núi',
  'nước',
  'người',
  'học',
  'nhà',
  'bạn',
  'ăn',
  'cơm',
  'trà',
  'thầy',
  'giáo',
  'tiền',
  'muốn',
  'đến',
  'đi',
  'ở',
  'năm',
  'tháng',
  'ngày',
  'mưa',
  'lửa',
  'cây',
  'gỗ',
  'trời',
  'đất',
  'sông',
  'biển',
  'mặt',
  'trăng',
  'sao',
];

/** Dataset D-L: 12 000 synthetic lexemes (deterministic). */
function datasetDL(n = 12_000) {
  let seed = 42;
  const rnd = (k: number) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed % k;
  };
  const tone = (s: string) => {
    const v = s.search(/[aeiou]/);
    const marks = MARKS[s[v]!]!;
    return s.slice(0, v) + marks[rnd(4)] + s.slice(v + 1);
  };
  return Array.from({ length: n }, (_, i) => ({
    id: `dl-${i}`,
    simplified: String.fromCodePoint(0x4e00 + rnd(20_000), 0x4e00 + rnd(20_000)),
    traditional: null,
    pinyin: `${tone(SYLLABLES[rnd(30)]!)} ${tone(SYLLABLES[rnd(30)]!)}`,
    meaningVi: `${WORDS[rnd(30)]} ${WORDS[rnd(30)]}`,
    example: null,
    exampleVi: null,
  }));
}

test('P2: dictionary lookup p95 < 200 ms on D-L (12 000 lexemes), CPU 4× slower', async ({
  page,
}, info) => {
  test.slow();
  const lexemes = [
    {
      id: 'lx-shan',
      simplified: '山',
      traditional: null,
      pinyin: 'shān',
      meaningVi: 'núi',
      example: null,
      exampleVi: null,
    },
    ...datasetDL(),
  ];
  const snapshot = { source: 'mock', version: 'dl-v1', lexemes, courses: [] };
  await page.route('**/v1/content/version', (r) =>
    r.fulfill({ json: { source: 'mock', version: 'dl-v1' } }),
  );
  await page.route('**/v1/content', (r) => r.fulfill({ json: snapshot }));
  await signIn(page);
  await page.goto('/dictionary');
  const search = page.getByTestId('dictionary-search');
  await search.fill('山');
  await expect(page.getByTestId('dictionary-row').first()).toContainText('山'); // D-L loaded
  await search.fill('');

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const queries = [
    's',
    'sh',
    'sha',
    'shan',
    'shan1',
    'n',
    'nu',
    'nui',
    'h',
    'ho',
    'hoc',
    'x',
    'xue',
    'z',
    'zhong',
    'nuoc',
    'ng',
    'nguoi',
    'ma',
    'ma3',
    'q',
    'qian',
    'ti',
    'tien',
    'ch',
    'cha',
    '山',
    'tra',
    'gi',
    'giao',
  ];
  const durations: number[] = [];
  for (const q of [...queries, ...queries.slice(0, 10)]) {
    const ms = await page.evaluate(
      (value) =>
        new Promise<number>((resolve) => {
          const input = document.querySelector<HTMLInputElement>(
            '[data-testid="dictionary-search"]',
          )!;
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
          const start = performance.now();
          setter.call(input, value);
          // React renders a discrete input event synchronously; the next frame shows the result.
          input.dispatchEvent(new Event('input', { bubbles: true }));
          requestAnimationFrame(() => resolve(performance.now() - start));
        }),
      q,
    );
    durations.push(ms);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1]!;
  const p50 = sorted[Math.floor(sorted.length / 2)]!;
  await info.attach('p2-dictionary.json', {
    body: JSON.stringify({ p50, p95, n: durations.length, durations }, null, 2),
    contentType: 'application/json',
  });
  console.log(
    `P2 dictionary (D-L 12k, CPU 4×): p50 ${p50.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms`,
  );
  expect(p95, 'P2 p95 (ms)').toBeLessThan(200);
});
