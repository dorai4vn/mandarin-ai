// Lab performance baseline (docs/PERFORMANCE.md §5). NOT a substitute for HTTPS/real-device runs.
// Usage: start API (dev, HS256 secret below, HANDWRITING_ADAPTER=hanzilookup) and `next start`, then
//   node perf/lab-baseline.mjs > perf-result.json      (env BASE, API overrides the defaults)
// Chromium only: CPU throttling is a Chromium/CDP feature.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { SignJWT } = require('jose');
const BASE = process.env.BASE ?? 'http://localhost:3000';
const API = process.env.API ?? 'http://127.0.0.1:8787';
const PAGES = ['/', '/dictionary', '/lab/handwriting', '/lab/audio', '/lab/offline'];
const RUNS = 5;
const profiles = {
  'mobile-throttled': {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    cpu: 4,
    net: {
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    },
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
    cpu: 1,
    net: null,
  },
};
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const med = (a) => pct(a, 50);
const token = await new SignJWT({ role: 'authenticated' })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(crypto.randomUUID())
  .setAudience('authenticated')
  .setExpirationTime('30m')
  .sign(new TextEncoder().encode('e2e-only-secret-not-used-anywhere-else-0123456789'));
const browser = await chromium.launch();
const out = {};
for (const [name, prof] of Object.entries(profiles)) {
  out[name] = {};
  for (const path of PAGES) {
    const r = { lcp: [], cls: [], ttfb: [], jsKB: [], jsCount: 0 };
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({
        viewport: prof.viewport,
        isMobile: prof.isMobile,
        hasTouch: prof.hasTouch,
        serviceWorkers: 'block',
      });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
      if (prof.net)
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...prof.net });
      let js = 0,
        n = 0;
      const types = new Map();
      cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
      cdp.on('Network.loadingFinished', (e) => {
        if (types.get(e.requestId) === 'Script') {
          js += e.encodedDataLength;
          n++;
        }
      });
      await page.addInitScript(() => {
        window.__lcp = 0;
        window.__cls = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__lcp = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => ({
        lcp: window.__lcp,
        cls: window.__cls,
        ttfb: performance.getEntriesByType('navigation')[0].responseStart,
      }));
      r.lcp.push(m.lcp);
      r.cls.push(m.cls);
      r.ttfb.push(m.ttfb);
      r.jsKB.push(js / 1024);
      r.jsCount = n;
      await ctx.close();
    }
    out[name][path] = {
      lcp_median: Math.round(med(r.lcp)),
      lcp_max: Math.round(Math.max(...r.lcp)),
      cls_max: +Math.max(...r.cls).toFixed(3),
      ttfb_median: Math.round(med(r.ttfb)),
      js_kb_transferred: Math.round(med(r.jsKB)),
      js_files: r.jsCount,
    };
  }
}
// Interaction latency: click "Lưu" on /lab/offline (IndexedDB write + optimistic UI) — Event Timing durations.
for (const [name, prof] of Object.entries(profiles)) {
  const ctx = await browser.newContext({
    viewport: prof.viewport,
    isMobile: prof.isMobile,
    hasTouch: prof.hasTouch,
    serviceWorkers: 'block',
  });
  await ctx.addInitScript((t) => sessionStorage.setItem('mandarin.devAccessToken', t), token);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  await page.addInitScript(() => {
    window.__ev = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (e.name === 'click' || e.name === 'pointerup' || e.name === 'pointerdown')
          window.__ev.push(e.duration);
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  });
  await page.goto(BASE + '/lab/offline');
  await page.getByTestId('note-add').waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-testid="note-add"]').disabled);
  const t0 = [];
  for (let i = 0; i < 20; i++) {
    await page.getByTestId('note-input').fill('山 ' + i);
    const start = Date.now();
    await page.getByTestId('note-add').click();
    await page
      .getByTestId('note-list')
      .getByText('山 ' + i, { exact: true })
      .waitFor();
    t0.push(Date.now() - start);
  }
  const ev = await page.evaluate(() => window.__ev);
  // Handwriting recognition round trip (synthetic strokes) via API on localhost.
  await page.goto(BASE + '/lab/handwriting');
  const rt = [];
  for (let i = 0; i < 10; i++) {
    const res = await page.evaluate(async (api) => {
      const t = performance.now();
      const r = await fetch(api + '/v1/handwriting/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + sessionStorage.getItem('mandarin.devAccessToken'),
        },
        body: JSON.stringify({
          strokes: [
            {
              points: [
                { x: 50, y: 5, t: 0 },
                { x: 50, y: 95, t: 100 },
              ],
            },
            {
              points: [
                { x: 10, y: 40, t: 200 },
                { x: 10, y: 95, t: 250 },
                { x: 90, y: 95, t: 300 },
              ],
            },
            {
              points: [
                { x: 90, y: 40, t: 400 },
                { x: 90, y: 95, t: 450 },
              ],
            },
          ],
        }),
      });
      await r.json();
      return performance.now() - t;
    }, API);
    rt.push(res);
  }
  out[name].interaction = {
    save_note_click_to_visible_ms: { p50: med(t0), p95: pct(t0, 95) },
    event_timing_entries_over_16ms: ev.length,
    event_timing_max_ms: ev.length ? Math.max(...ev) : 0,
    handwriting_api_roundtrip_ms_localhost: {
      p50: Math.round(med(rt)),
      p95: Math.round(pct(rt, 95)),
    },
  };
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
