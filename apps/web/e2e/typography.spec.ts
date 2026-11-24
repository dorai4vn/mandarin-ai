import { expect, test, type Page } from '@playwright/test';

/**
 * UI-1 (D-039, TOKENS_V2 §4): Inter renders Vietnamese and pinyin, Noto Sans SC renders Chinese,
 * every Chinese text node is inside lang="zh-Hans", and the fonts come from this app's own origin.
 * "Rendered by the font" is checked through the CSS Font Loading API: after layout, each character
 * must be covered by the unicode-range of a face of that family whose status is "loaded" — so a
 * missing glyph silently drawn by a system fallback font would fail the test.
 * Font loading does not depend on viewport size, so this runs once per engine (desktop project).
 */
const SAMPLES = {
  vietnamese: 'Tiếng Việt: ắ ặ ộ ở ữ đ ơ ư Ừ Ỹ — học chữ Hán mỗi ngày',
  pinyin: 'nǐ hǎo · lǜ · zhōngguó · Ā Á Ǎ À ǖ ǘ ǚ ǜ ü',
  hanzi: '你好中国学习汉字山水人绿',
};

test.beforeEach(({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'fonts: once per engine');
  void page;
});

async function familyOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) =>
    getComputedStyle(el)
      .fontFamily.split(',')[0]!
      .trim()
      .replace(/^["']|["']$/g, ''),
  );
}

/** Characters of `text` not covered by a LOADED face of `family` (empty = all rendered by it). */
async function uncovered(page: Page, family: string, text: string) {
  return page.evaluate(
    async ({ family, text }) => {
      await document.fonts.ready;
      const inRange = (cp: number, range: string) =>
        range.split(',').some((part) => {
          const p = part.trim().replace(/^U\+/i, '');
          if (p.includes('?')) {
            const lo = parseInt(p.replace(/\?/g, '0'), 16);
            const hi = parseInt(p.replace(/\?/g, 'F'), 16);
            return cp >= lo && cp <= hi;
          }
          const [a, b] = p.split('-');
          const lo = parseInt(a!, 16);
          const hi = b ? parseInt(b.replace(/^U\+/i, ''), 16) : lo;
          return cp >= lo && cp <= hi;
        });
      const faces = [...document.fonts].filter(
        (f) => f.family.replace(/^["']|["']$/g, '') === family && f.status === 'loaded',
      );
      const missing = new Set<string>();
      for (const ch of text) {
        if (/\s/.test(ch)) continue;
        const cp = ch.codePointAt(0)!;
        if (!faces.some((f) => inRange(cp, f.unicodeRange))) missing.add(ch);
      }
      return [...missing];
    },
    { family, text },
  );
}

test('Inter renders Vietnamese and pinyin; Noto Sans SC renders Hanzi (self-hosted)', async ({
  page,
}) => {
  const fontHosts = new Set<string>();
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fontHosts.add(new URL(r.url()).host);
  });
  await page.goto('/lab/audio');
  // Inject probes only after React has hydrated <main>; earlier nodes would be discarded.
  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    return !!main && Object.keys(main).some((k) => k.startsWith('__react'));
  });
  await page.evaluate((s) => {
    const host = document.querySelector('main')!;
    const add = (lang: string | null, text: string, id: string) => {
      const p = document.createElement('p');
      if (lang) p.lang = lang;
      p.id = id;
      p.textContent = text;
      host.append(p);
    };
    add(null, s.vietnamese, 'probe-vi');
    add('zh-Latn-pinyin', s.pinyin, 'probe-pinyin');
    add('zh-Hans', s.hanzi, 'probe-hanzi');
  }, SAMPLES);

  const sans = await familyOf(page, '#probe-vi');
  const pinyin = await familyOf(page, '#probe-pinyin');
  const hanzi = await familyOf(page, '#probe-hanzi');
  expect(sans).toBe('Inter');
  expect(pinyin).toBe('Inter');
  expect(hanzi).toMatch(/Noto Sans SC/);

  expect(await uncovered(page, sans, SAMPLES.vietnamese), 'Vietnamese glyphs').toEqual([]);
  expect(await uncovered(page, pinyin, SAMPLES.pinyin), 'pinyin tone marks').toEqual([]);
  expect(await uncovered(page, hanzi, SAMPLES.hanzi), 'Hanzi').toEqual([]);

  // Fonts are served by this app (next/font self-hosting), never by Google at runtime.
  const appHost = new URL(page.url()).host;
  expect([...fontHosts].filter((h) => h !== appHost)).toEqual([]);
  expect(fontHosts.size).toBeGreaterThan(0);
});

test('every Chinese text on the main pages is inside lang="zh-Hans"', async ({ page }) => {
  for (const path of ['/', '/dictionary', '/lab/audio', '/lab/handwriting', '/practice']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const offenders = await page.evaluate(() => {
      const han = /[㐀-䶿一-鿿]/;
      const bad: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? '';
        if (!han.test(text)) continue;
        const el = n.parentElement;
        if (!el || el.closest('script,style,noscript')) continue;
        const lang = el.closest('[lang]')?.getAttribute('lang') ?? '';
        if (!lang.startsWith('zh')) bad.push(`${text.trim().slice(0, 20)} (lang=${lang})`);
      }
      return bad;
    });
    expect(offenders, path).toEqual([]);
  }
});
