// Task B2 hardening tests. All data is SYNTHETIC; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient, assertApiOk, readBounded } from '../src/client.mjs';
import { runImport, evaluateFile } from '../src/importer.mjs';
import { normalizeSha1, verifySha1, sha1Hex } from '../src/provenance.mjs';
import { sanitizeSvg } from '../src/sanitize.mjs';
import { page, fakeClient, SAFE_SVG, sha1of } from './helpers.mjs';

const UA = 'test (synthetic)';
const URL1 = 'https://upload.wikimedia.org/wikipedia/commons/synthetic/x.svg';
const svgResp = (body, init) => new Response(body, init);

test('sha1: hex and base36 both verify against raw bytes; wrong/garbage rejected', () => {
  const bytes = Buffer.from(SAFE_SVG);
  const hex = sha1Hex(bytes);
  const b36 = BigInt('0x' + hex).toString(36).padStart(31, '0');
  assert.equal(normalizeSha1(b36), hex);
  assert.ok(verifySha1(bytes, hex) && verifySha1(bytes, b36));
  assert.ok(!verifySha1(Buffer.from('other'), hex));
  assert.equal(normalizeSha1('xyz'), null);
  assert.equal(normalizeSha1('z'.repeat(31)), null); // exceeds 160 bits
});

test('client: download verifies sha1 on raw bytes; mismatch rejected and not cached', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ci-'));
  const cl = createClient({ fetchImpl: async () => svgResp('tampered'), userAgent: UA, cacheDir: dir });
  await assert.rejects(cl.downloadSvg(URL1, { sha1: sha1of(SAFE_SVG) }), /sha1-mismatch/);
  assert.equal((await readdir(dir)).length, 0);
  await assert.rejects(cl.downloadSvg(URL1), /sha1-required/);
});

test('client: cache is bound to upstream sha1; corrupted cache file is re-verified, not trusted', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ci-'));
  let calls = 0;
  const mk = (body) =>
    createClient({
      fetchImpl: async () => (calls++, svgResp(body)),
      userAgent: UA,
      cacheDir: dir,
    });
  const v1 = SAFE_SVG;
  const v2 = SAFE_SVG.replace('M0 0', 'M1 1');
  assert.equal(await mk(v1).downloadSvg(URL1, { sha1: sha1of(v1) }), v1);
  assert.equal(await mk(v1).downloadSvg(URL1, { sha1: sha1of(v1) }), v1);
  assert.equal(calls, 1); // cache hit
  // upstream changed (new sha1 for same URL): old cache must not be served
  assert.equal(await mk(v2).downloadSvg(URL1, { sha1: sha1of(v2) }), v2);
  assert.equal(calls, 2);
  // corrupt every cache file's body: must be detected and refetched
  for (const f of await readdir(dir)) {
    const p = path.join(dir, f);
    const e = JSON.parse(await (await import('node:fs/promises')).readFile(p, 'utf8'));
    e.body = 'poisoned';
    await writeFile(p, JSON.stringify(e));
  }
  assert.equal(await mk(v1).downloadSvg(URL1, { sha1: sha1of(v1) }), v1);
  assert.equal(calls, 3);
});

test('client: API JSON cache expires by TTL; offline may use stale', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ci-'));
  let t = 1000;
  let calls = 0;
  const f = async () => (calls++, Response.json({ query: { pages: [] } }));
  const mk = (extra = {}) =>
    createClient({ fetchImpl: f, userAgent: UA, cacheDir: dir, now: () => t, maxAgeMs: 100, ...extra });
  await mk().listCategory('Category:S');
  await mk().listCategory('Category:S');
  assert.equal(calls, 1);
  t += 101;
  await mk().listCategory('Category:S');
  assert.equal(calls, 2);
  t += 10_000;
  await mk({ offline: true }).listCategory('Category:S'); // stale allowed only offline
  assert.equal(calls, 2);
});

test('client: API-level error with HTTP 200 is rejected and never cached', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ci-'));
  const cl = createClient({
    fetchImpl: async () => Response.json({ error: { code: 'ratelimited' } }),
    userAgent: UA,
    cacheDir: dir,
  });
  await assert.rejects(cl.listCategory('Category:S'), /api-error:ratelimited/);
  assert.equal((await readdir(dir)).length, 0);
  assert.throws(() => assertApiOk([]), /api-malformed/);
  assert.throws(() => assertApiOk({ query: { pages: {} } }), /api-malformed/);
});

test('client: redirects are refused (API and file)', async () => {
  const f = async () =>
    new Response(null, { status: 302, headers: { location: 'https://evil.example/' } });
  const cl = createClient({ fetchImpl: f, userAgent: UA });
  await assert.rejects(cl.listCategory('Category:S'), /redirect-not-allowed/);
  await assert.rejects(cl.downloadSvg(URL1, { sha1: sha1of('x') }), /redirect-not-allowed/);
  const g = async () => ({ ok: true, status: 200, redirected: true, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) });
  await assert.rejects(
    createClient({ fetchImpl: g, userAgent: UA }).downloadSvg(URL1, { sha1: sha1of('x') }),
    /redirect-not-allowed/,
  );
});

test('client: fetch is called with redirect:manual and an abort signal; timeout aborts', async () => {
  let init;
  const cl = createClient({
    fetchImpl: (u, i) => {
      init = i;
      return new Promise((_, rej) => i.signal.addEventListener('abort', () => rej(new Error('aborted'))));
    },
    userAgent: UA,
    timeoutMs: 20,
  });
  await assert.rejects(cl.downloadSvg(URL1, { sha1: sha1of('x') }), /aborted/);
  assert.equal(init.redirect, 'manual');
});

test('client: oversized bodies rejected by content-length and by streamed size', async () => {
  const big = 'a'.repeat(1024 * 1024 + 1);
  await assert.rejects(
    createClient({ fetchImpl: async () => svgResp(big), userAgent: UA }).downloadSvg(URL1, {
      sha1: sha1of(big),
    }),
    /response-too-large/,
  );
  const r = svgResp('hello');
  await assert.rejects(readBounded(r, 3), /response-too-large/);
  const lied = svgResp('x', { headers: { 'content-length': '999999999' } });
  await assert.rejects(readBounded(lied, 10), /response-too-large/);
});

test('importer: provenance, licence name/version/url enforced', () => {
  const bad = (opts, re, mut) => {
    const p = page('File:t.svg', opts);
    mut?.(p.imageinfo[0]);
    const r = evaluateFile(p);
    assert.equal(r.status, 'rejected');
    assert.match(r.reason, re);
  };
  assert.equal(evaluateFile(page('File:t.svg')).status, 'eligible');
  assert.equal(evaluateFile(page('File:t.svg')).licence.url, 'https://creativecommons.org/licenses/by-sa/4.0/');
  bad({ licUrl: 'https://example.invalid/l' }, /licence-url-not-canonical/);
  bad({ licUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' }, /licence-url-not-canonical/); // version mismatch
  bad({ licUrl: '' }, /licence-url-not-canonical/);
  bad({ lic: 'CC BY-SA' }, /licence-unknown/); // no version
  bad({}, /sha1-invalid/, (ii) => (ii.sha1 = 'nope'));
  bad({}, /source-url-invalid/, (ii) => (ii.descriptionurl = 'http://commons.wikimedia.org/wiki/X'));
  bad({}, /file-url-invalid/, (ii) => (ii.url = 'https://evil.example/a.svg'));
  const p = page('File:t.svg');
  delete p.revisions;
  assert.equal(evaluateFile(p).reason, 'revision-missing');
  const q = page('File:t.svg');
  q.revisions = [{ revid: 5 }];
  assert.equal(evaluateFile(q).reason, 'revision-missing');
});

test('importer: downloaded bytes not matching upstream sha1 are rejected', async () => {
  const p = [page('File:m.svg')];
  const c = fakeClient(p, { [p[0].imageinfo[0].url]: SAFE_SVG.replace('M0 0', 'M3 3') });
  const { manifest } = await runImport({ client: c, categories: ['Category:S'] });
  assert.equal(manifest.entries.length, 0);
  assert.equal(manifest.rejected[0].reason, 'sha1-mismatch');
});

async function firstRun() {
  const p = [page('File:m.svg')];
  const first = await runImport({ client: fakeClient(p), categories: ['Category:S'] });
  const e = first.manifest.entries[0];
  const { svg, ...rest } = e;
  const prior = { entries: [{ ...rest, file: 'svg/0.svg', character: '山', stage: 'x' }] };
  return { p, prior, svg };
}

test('incremental: reuse requires valid local file matching checksum', async () => {
  const { p, prior, svg } = await firstRun();
  const run = (readLocal) =>
    runImport({ client: fakeClient(p), categories: ['Category:S'], prior, readLocal });
  assert.equal((await run(async () => svg)).report.reused, 1);
  assert.equal((await run(null)).report.reused, 0); // no verifier => no reuse
  for (const bad of [async () => null, async () => svg + ' ', async () => { throw new Error('ENOENT'); }]) {
    const r = await run(bad);
    assert.equal(r.report.reused, 0);
    assert.equal(r.report.downloaded, 1);
    assert.equal(r.manifest.entries[0].character, '山'); // evidence unchanged => mapping kept
  }
});

test('incremental: mapping preserved only when evidence unchanged (licence/author/revision/sha1)', async () => {
  const { prior, svg } = await firstRun();
  const variants = [
    page('File:m.svg', { author: 'Someone Else' }),
    page('File:m.svg', { lic: 'CC BY 4.0' }),
    page('File:m.svg', { revid: 2 }),
  ];
  for (const v of variants) {
    const r = await runImport({
      client: fakeClient([v]),
      categories: ['Category:S'],
      prior,
      readLocal: async () => svg,
    });
    assert.equal(r.report.reused, 0);
    assert.equal(r.manifest.entries[0].character, null);
    assert.equal(r.report.mappingsDropped, 1);
  }
});

test('sanitizer: duplicate attributes rejected (case-insensitive)', () => {
  const s = (a) => `<svg xmlns="http://www.w3.org/2000/svg"><path ${a}/></svg>`;
  assert.throws(() => sanitizeSvg(s('d="M0 0" d="M1 1"')), /duplicate-attribute/);
  assert.throws(() => sanitizeSvg(s('fill="red" FILL="blue"')), /duplicate-attribute/);
  assert.doesNotThrow(() => sanitizeSvg(s('d="M0 0" fill="red"')));
});

test('sanitizer: CSS-escaped / commented external url() values rejected', () => {
  const s = (v) => `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="${v}"/></svg>`;
  for (const v of ['u\\72l(http://e.example/a)', '\\75rl(http://e.example/a)', 'url(/**/http://e.example/a)', 'url(http://e.example/a)', 'url(&#117;)'])
    assert.throws(() => sanitizeSvg(s(v)));
  assert.doesNotThrow(() => sanitizeSvg(s('url(#g1)')));
});
