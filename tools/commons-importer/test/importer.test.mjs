import test from 'node:test';
import assert from 'node:assert/strict';
import { runImport, serialize } from '../src/importer.mjs';
import { createClient, BudgetExceeded } from '../src/client.mjs';
import { page, fakeClient, SAFE_SVG } from './helpers.mjs';

const cats = ['Category:Synthetic'];
const pages = () => [
  page('File:b.svg', { revid: 2, sha1: 'b'.repeat(40) }),
  page('File:a.svg', { lic: 'CC0', author: '', revid: 1 }),
  page('File:nc.svg', { lic: 'CC BY-NC 4.0' }),
  page('File:unknown.svg', { lic: 'Weird' }),
  page('File:noauthor.svg', { lic: 'CC BY 4.0', author: '' }),
  page('File:png.png', { mime: 'image/png' }),
  page('File:b.svg', { revid: 2, sha1: 'b'.repeat(40) }), // duplicate listing
];

test('imports eligible, rejects the rest with reasons, deterministic order', async () => {
  const c = fakeClient(pages(), {
    [pages()[0].imageinfo[0].url]: SAFE_SVG.replace('M0 0L10 10', 'M1 1L9 9'),
  });
  const { manifest, report } = await runImport({ client: c, categories: cats });
  assert.deepEqual(
    manifest.entries.map((e) => e.title),
    ['File:a.svg', 'File:b.svg'],
  );
  assert.equal(report.duplicates, 1);
  const reasons = Object.fromEntries(manifest.rejected.map((r) => [r.title, r.reason]));
  assert.match(reasons['File:nc.svg'], /licence-not-allowed/);
  assert.match(reasons['File:unknown.svg'], /licence-unknown/);
  assert.equal(reasons['File:noauthor.svg'], 'attribution-required-but-author-missing');
  assert.match(reasons['File:png.png'], /mime-not-svg/);
  for (const e of manifest.entries) {
    assert.ok(e.upstreamSha1 && e.sanitizedSha256 && e.revisionId && e.fileUrl && e.sourceUrl);
    assert.equal(e.character, null);
  }
  assert.equal(manifest.entries[1].licence.shareAlike, true);
  assert.match(report.characterCoverage, /unverified/);
});

test('identical content under different titles is deduped', async () => {
  const c = fakeClient([page('File:x.svg'), page('File:y.svg', { revid: 3 })]);
  const { manifest } = await runImport({ client: c, categories: cats });
  assert.equal(manifest.entries.length, 1);
  assert.match(manifest.rejected[0].reason, /duplicate-content-of:File:x.svg/);
});

test('unsafe svg rejected, others kept', async () => {
  const p = [page('File:ok.svg'), page('File:evil.svg', { revid: 9 })];
  const c = fakeClient(p, {
    [p[1].imageinfo[0].url]: '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
  });
  const { manifest } = await runImport({ client: c, categories: cats });
  assert.deepEqual(
    manifest.entries.map((e) => e.title),
    ['File:ok.svg'],
  );
  assert.match(manifest.rejected[0].reason, /svg-unsafe:element-not-allowed/);
});

test('dry-run downloads nothing and emits no svg', async () => {
  const c = fakeClient(pages());
  const { manifest, report } = await runImport({ client: c, categories: cats, dryRun: true });
  assert.equal(c.calls.download.length, 0);
  assert.equal(report.dryRun, true);
  assert.ok(manifest.entries.every((e) => !e.svg));
});

test('incremental: unchanged reused, changed re-downloaded, curated mapping preserved', async () => {
  const first = await runImport({ client: fakeClient(pages()), categories: cats });
  const persisted = JSON.parse(
    serialize({
      ...first.manifest,
      entries: first.manifest.entries.map(({ svg, ...r }, i) => ({
        ...r,
        file: `svg/${i}.svg`,
        character: i ? null : '山',
      })),
    }),
  );
  const p = pages();
  p[0] = page('File:b.svg', { revid: 3, sha1: 'c'.repeat(40) });
  const c = fakeClient(p);
  const { manifest, report } = await runImport({ client: c, categories: cats, prior: persisted });
  assert.equal(report.reused, 1);
  assert.equal(report.downloaded, 1);
  assert.equal(c.calls.download.length, 1);
  assert.equal(manifest.entries.find((e) => e.title === 'File:a.svg').character, '山');
});

test('manifest serialization is byte-identical across runs', async () => {
  const a = serialize(
    (await runImport({ client: fakeClient(pages()), categories: cats })).manifest,
  );
  const b = serialize(
    (await runImport({ client: fakeClient(pages().reverse()), categories: cats })).manifest,
  );
  assert.equal(a, b);
});

test('client: pagination follows continue, request budget enforced, truncation reported', async () => {
  let n = 0;
  const urls = [];
  const fetchImpl = async (u) => {
    urls.push(u);
    n++;
    return {
      ok: true,
      json: async () => ({
        query: { pages: [page(`File:${n}.svg`)] },
        ...(n < 10 ? { continue: { gcmcontinue: `t${n}`, continue: 'gcmcontinue||' } } : {}),
      }),
    };
  };
  const cl = createClient({ fetchImpl, userAgent: 'test (synthetic)', maxRequests: 3 });
  const r = await cl.listCategory('Category:S', { pageLimit: 2 });
  assert.equal(r.files.length, 2);
  assert.equal(r.complete, false);
  assert.match(urls[1], /gcmcontinue=t1/);
  await assert.rejects(cl.listCategory('Category:S', { pageLimit: 5 }), BudgetExceeded);
});

test('client: requires UA, restricts download host, offline cache miss fails without network', async () => {
  assert.throws(() =>
    createClient({
      fetchImpl: async () => {
        throw new Error('net');
      },
    }),
  );
  const cl = createClient({
    fetchImpl: async () => {
      throw new Error('net');
    },
    userAgent: 'x',
    offline: true,
  });
  await assert.rejects(cl.downloadSvg('https://evil.example/x.svg'), /host-not-allowed/);
  await assert.rejects(cl.downloadSvg('https://upload.wikimedia.org/x.svg'), /offline-cache-miss/);
});
