// SYNTHETIC fixtures only; no network. Covers pacing, Retry-After, 429 halt, partial/resume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createClient, parseRetryAfter, RateLimited } from '../src/client.mjs';
import { runImport } from '../src/importer.mjs';
import { persistManifest } from '../src/persist.mjs';
import { page, SAFE_SVG, sha1of } from './helpers.mjs';

const json = (o) => ({ ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => Buffer.from(JSON.stringify(o)) });
const ok = { query: { pages: [] } };

test('parseRetryAfter handles seconds, dates, junk', () => {
  assert.equal(parseRetryAfter('30', 0), 30);
  assert.equal(parseRetryAfter(new Date(5000).toUTCString(), 0), 5);
  assert.equal(parseRetryAfter('soon', 0), null);
  assert.equal(parseRetryAfter(null, 0), null);
});

test('requests are serial with >=2s spacing', async () => {
  let t = 0;
  const sleeps = [];
  const c = createClient({
    userAgent: 'test (x)',
    fetchImpl: async () => json(ok),
    now: () => t,
    sleep: async (ms) => { sleeps.push(ms); t += ms; },
  });
  await c.listTitles(['File:A.svg']);
  await c.listTitles(['File:B.svg']);
  await c.listTitles(['File:C.svg']);
  assert.deepEqual(sleeps, [2000, 2000]);
});

test('429 raises RateLimited with Retry-After and blocks all later requests', async () => {
  let fetches = 0;
  const c = createClient({
    userAgent: 'test (x)', minIntervalMs: 0,
    fetchImpl: async () => { fetches++; return { ok: false, status: 429, headers: new Headers({ 'retry-after': '120' }) }; },
  });
  await assert.rejects(c.listTitles(['File:A.svg']), (e) => e instanceof RateLimited && e.retryAfterSeconds === 120 && !!e.retryAt);
  await assert.rejects(c.listTitles(['File:B.svg']), RateLimited);
  assert.equal(fetches, 1, 'no automatic retry, no second request');
});

function mkClient(pages, { failAfter = Infinity } = {}) {
  let n = 0;
  const downloads = [];
  return {
    downloads,
    async listCategory() { return { files: pages, complete: true }; },
    async downloadSvg(u) {
      if (n++ >= failAfter) throw new RateLimited(429, 60, '2030-01-01T00:00:00.000Z');
      downloads.push(u);
      return SAFE_SVG.replace('synthetic', 'synthetic ' + u.length + n);
    },
  };
}
const mk = (names) => names.map((n, i) => {
  const svg = SAFE_SVG.replace('synthetic', 'synthetic' + i);
  return page(n, { svg, revid: i + 1 });
});

test('429 mid-run: persists verified partial, marks rest pending, resume continues without redownload', async () => {
  const pages = mk(['File:A.svg', 'File:B.svg', 'File:C.svg']);
  const raw = Object.fromEntries(pages.map((p) => [p.imageinfo[0].url, SAFE_SVG.replace('synthetic', 'synthetic' + (p.revisions[0].revid - 1))]));
  const mkc = (failAfter) => {
    let n = 0; const downloads = [];
    return { downloads,
      async listCategory() { return { files: pages, complete: true }; },
      async downloadSvg(u) { if (n++ >= failAfter) throw new RateLimited(429, 60, 'T'); downloads.push(u); return raw[u]; } };
  };
  const dir = await mkdtemp(path.join(os.tmpdir(), 'c1b-'));
  const c1 = mkc(1);
  const r1 = await runImport({ client: c1, categories: ['Category:X'], onCheckpoint: (m) => persistManifest(dir, m) });
  await persistManifest(dir, r1.manifest);
  assert.equal(r1.report.persistedVerified, 1);
  assert.equal(r1.report.pendingDownload, 2);
  assert.equal(r1.manifest.partial, true);
  assert.equal(r1.manifest.halted.reason, 'http-429');
  assert.equal(r1.manifest.halted.retryAfterSeconds, 60);
  const saved = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  assert.ok(saved.entries.every((e) => e.review === 'pending-review' && e.stage === null && e.character === null));
  assert.equal(saved.entries.filter((e) => e.file).length, 1);

  const c2 = mkc(Infinity);
  const r2 = await runImport({ client: c2, categories: ['Category:X'], prior: saved,
    readLocal: async (e) => readFile(path.join(dir, e.file), 'utf8') });
  assert.equal(r2.report.reused, 1);
  assert.equal(c2.downloads.length, 2, 'only the pending files are fetched');
  assert.equal(r2.report.pendingDownload, 0);
  assert.equal(r2.manifest.partial, false);
});

test('maxDownloads bounds a pilot run', async () => {
  const pages = mk(['File:A.svg', 'File:B.svg', 'File:C.svg']);
  const raw = Object.fromEntries(pages.map((p) => [p.imageinfo[0].url, SAFE_SVG.replace('synthetic', 'synthetic' + (p.revisions[0].revid - 1))]));
  const client = { async listCategory() { return { files: pages, complete: true }; }, async downloadSvg(u) { return raw[u]; } };
  const r = await runImport({ client, categories: ['Category:X'], maxDownloads: 2 });
  assert.equal(r.report.downloaded, 2);
  assert.equal(r.report.pendingDownload, 1);
  assert.equal(r.manifest.halted.reason, 'max-downloads');
});

test('429 during listing preserves prior manifest', async () => {
  const prior = { schema: 'commons-import-manifest/1', entries: [{ title: 'File:K.svg' }], rejected: [], missingTitles: [] };
  const client = { async listCategory() { throw new RateLimited(429, null, null); } };
  const r = await runImport({ client, categories: ['Category:X'], prior });
  assert.equal(r.manifest.entries.length, 1);
  assert.equal(r.manifest.halted.reason, 'http-429');
});
