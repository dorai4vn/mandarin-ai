// Renders lockup previews: the mark extracted from the reference image + REAL text in the official
// brand typography (UI-7A spec):
//   "Mandarin AI"          Nunito 800, letter-spacing -0.02em, line-height 1.1
//   "TỰ HỌC TIẾNG TRUNG"   Nunito 600, uppercase, letter-spacing 0.16em, line-height 1.3, ~38 % of title
// Usage: node render_lockup.mjs <outDir>   (needs Playwright; fonts from ./fetch_fonts.sh)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2] ?? here;
const themes = {
  light: { bg: '#FFFFFF', title: '#0A1B2F', tag: '#53617B' },
  dark: { bg: '#0A1F37', title: '#FFFFFF', tag: '#BACEED' },
};
// Proportions measured on the reference: full lockup (top of the image) and sidebar lockup.
const presets = {
  full: { title: 0.34, gap: 0.06 },
  sidebar: { title: 0.52, gap: 0.08 },
};
const TAG_RATIO = 0.38;

const html = (t, h, p) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts/nunito.css"><style>
body{margin:0;background:${themes[t].bg}}
.l{display:inline-flex;align-items:center;gap:${h * p.gap}px;padding:${h * 0.2}px ${h * 0.3}px;font-family:Nunito}
img{height:${h}px;width:auto;display:block}
.t{display:flex;flex-direction:column}
.n{font-weight:800;font-size:${h * p.title}px;letter-spacing:-0.02em;line-height:1.1;color:${themes[t].title}}
.g{font-weight:600;font-size:${h * p.title * TAG_RATIO}px;letter-spacing:0.16em;line-height:1.3;text-transform:uppercase;color:${themes[t].tag}}
</style><div class="l"><img src="../raster/mark-${t}.png" alt=""><div class="t"><span class="n">Mandarin AI</span><span class="g">Tự học tiếng Trung</span></div></div>`;

const browser = await chromium.launch();
const file = path.join(here, '.lockup-preview.html');
const metrics = {};
for (const scale of [1, 2]) {
  const page = await browser.newPage({ deviceScaleFactor: scale });
  for (const t of Object.keys(themes)) {
    for (const [name, p] of Object.entries(presets)) {
      for (const h of name === 'full' ? [120, 200] : [40, 48]) {
        // file:// page so the local mark image and fonts load (setContent runs on about:blank).
        writeFileSync(file, html(t, h, p));
        await page.goto(pathToFileURL(file).href);
        await page.evaluate(() => document.fonts.ready);
        metrics[`${name}-${h}`] = await page.evaluate(() => {
          const ok = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.weight);
          const w = (s) => document.querySelector(s).getBoundingClientRect().width;
          return { fontsLoaded: [...new Set(ok)], titleW: w('.n'), tagW: w('.g') };
        });
        await page
          .locator('.l')
          .screenshot({ path: path.join(out, `lockup-${name}-${t}-h${h}@${scale}x.png`) });
      }
    }
  }
}
await browser.close();
unlinkSync(file);
console.log(JSON.stringify(metrics));
