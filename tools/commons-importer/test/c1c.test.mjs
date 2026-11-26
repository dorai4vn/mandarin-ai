// SYNTHETIC fixtures only (Inkscape-like structure written by hand; NOT real Commons files, NOT historical data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, RateLimited } from '../src/client.mjs';
import { runImport, evaluateFile } from '../src/importer.mjs';
import { sanitizeSvg, SvgRejected } from '../src/sanitize.mjs';
import { stripInertMetadata } from '../src/xmlclean.mjs';
import { page, SAFE_SVG, sha1of } from './helpers.mjs';

const INK = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (synthetic) -->
<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#"
 xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg"
 xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
 xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:xlink="http://www.w3.org/1999/xlink"
 viewBox="0 0 10 10" sodipodi:docname="synthetic.svg" inkscape:version="1.0">
 <sodipodi:namedview id="nv" inkscape:zoom="2"/>
 <metadata id="m"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format></cc:Work></rdf:RDF></metadata>
 <g id="layer1" inkscape:groupmode="layer" inkscape:label="L"><svg:path d="M0 0L10 10" id="p" sodipodi:nodetypes="cc"/></g>
</svg>`;

test('inert editor metadata is removed, geometry preserved, sanitizer then accepts', () => {
  const { svg, stripped } = stripInertMetadata(INK);
  assert.ok(stripped.elements >= 2 && stripped.attributes >= 4 && stripped.declarations >= 7);
  const clean = sanitizeSvg(svg);
  assert.match(clean, /<path d="M0 0L10 10" id="p"\/>/);
  assert.doesNotMatch(clean, /sodipodi|inkscape|rdf|dc:|metadata/);
  assert.equal(sanitizeSvg(clean), clean, 'idempotent');
});

test('evaluateFile persists an Inkscape-style file (was: rejected for xmlns:dc)', () => {
  const e = evaluateFile(page('File:S.svg', { svg: INK }), { downloaded: INK });
  assert.equal(e.status, 'eligible');
  assert.ok(e.svg && e.sanitizedSha256 && e.metadataStripped.elements >= 2);
  assert.equal(e.review, 'pending-review');
});

const rejects = (name, src, re) =>
  test(`adversarial: ${name}`, () => {
    assert.throws(
      () => sanitizeSvg(stripInertMetadata(src).svg),
      (e) => e instanceof SvgRejected && re.test(e.reason),
      src,
    );
  });
const NSV = 'xmlns="http://www.w3.org/2000/svg"';
rejects('DOCTYPE with entity', `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${NSV}/>`, /doctype/);
rejects('CDATA hiding metadata close', `<svg ${NSV}><metadata><![CDATA[</metadata><script/>]]></metadata></svg>`, /doctype/);
rejects('processing instruction', `<svg ${NSV}><?xml-stylesheet href="x"?></svg>`, /pi|doctype/);
rejects('script element', `<svg ${NSV}><script>alert(1)</script></svg>`, /element-not-allowed/);
rejects('prefixed svg:script', `<svg xmlns:svg="http://www.w3.org/2000/svg" ${NSV}><svg:script/></svg>`, /element-not-allowed/);
rejects('unknown-namespace element', `<svg ${NSV}><x:a xmlns:x="http://evil.example/"/></svg>`, /unknown-namespace-declaration/);
rejects('lookalike sodipodi namespace (trailing slash)', `<svg ${NSV} xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd/"><g sodipodi:x="1"/></svg>`, /unknown-namespace-declaration/);
rejects('undeclared prefix', `<svg ${NSV}><foo:g/></svg>`, /undeclared-prefix/);
rejects('xlink:href stays and is rejected', `<svg ${NSV} xmlns:xlink="http://www.w3.org/1999/xlink"><path xlink:href="http://e/x"/></svg>`, /attribute-not-allowed/);
rejects('duplicate attribute via different prefixes', `<svg ${NSV} xmlns:a="http://www.w3.org/1999/xlink" xmlns:b="http://www.w3.org/1999/xlink"><g a:href="1" b:href="2"/></svg>`, /duplicate-attribute/);
rejects('duplicate plain attribute', `<svg ${NSV}><path d="M0 0" d="M1 1"/></svg>`, /duplicate-attribute/);
rejects('event handler', `<svg ${NSV} onload="x()"/>`, /event-handler/);
rejects('style attribute', `<svg ${NSV}><g style="fill:url(http://e/x)"/></svg>`, /attribute-not-allowed/);
rejects('CSS-escaped url value', `<svg ${NSV}><path fill="u\\72l(http://e/x)"/></svg>`, /css-escape/);
rejects('active content hidden in an editor-looking attribute on svg element', `<svg ${NSV}><image href="http://e/x"/></svg>`, /element-not-allowed/);
rejects('mismatched tags', `<svg ${NSV}><g></svg>`, /mismatched|malformed/);
rejects('text outside title/desc', `<svg ${NSV}>hello</svg>`, /stray-text/);
rejects('undefined entity', `<svg ${NSV}><title>&xxe;</title></svg>`, /entity/);
rejects('root not svg ns', `<svg><g/></svg>`, /undeclared-prefix|bad-root/);
rejects('comment-wrapped close tag trick', `<svg ${NSV}><metadata><!-- </metadata> --></metadata><script/></svg>`, /element-not-allowed/);

test('active content inside <metadata> is dropped with the (inert) subtree, never kept', () => {
  const src = `<svg ${NSV} xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><metadata><rdf:RDF><script>x</script></rdf:RDF></metadata><path d="M0 0"/></svg>`;
  const out = sanitizeSvg(stripInertMetadata(src).svg);
  assert.doesNotMatch(out, /script/);
});

// ---- checkpoint completeness, cooldown, 503 ----
const mkPages = (n) =>
  Array.from({ length: n }, (_, i) => page(`File:P${i}.svg`, { svg: SAFE_SVG.replace('synthetic', 's' + i), revid: i + 1 }));
const raw = (p) => SAFE_SVG.replace('synthetic', 's' + (p.revisions[0].revid - 1));

test('checkpoint lists every eligible title; unprocessed ones are explicitly pending', async () => {
  const pages = mkPages(4);
  const cps = [];
  const client = {
    async listCategory() { return { files: pages, complete: true }; },
    async downloadSvg(u) { return raw(pages.find((p) => p.imageinfo[0].url === u)); },
  };
  await runImport({ client, categories: ['C'], onCheckpoint: async (m) => cps.push(structuredClone(m)) });
  assert.equal(cps.length, 4);
  cps.forEach((m, i) => {
    assert.equal(m.entries.length, 4, 'no title omitted');
    assert.equal(m.partial, i < 3, 'partial until the last pending entry is resolved');
  });
  assert.deepEqual(cps[0].entries.map((e) => !!e.sanitizedSha256), [true, false, false, false]);
  assert.ok(cps[0].entries.slice(1).every((e) => e.downloadStatus === 'pending'));
  assert.deepEqual(cps[2].entries.map((e) => e.downloadStatus ?? 'done'), ['done', 'done', 'done', 'pending']);
});

test('persisted retryAt is honoured across runs: no requests until it passes', async () => {
  const pages = mkPages(2);
  let calls = 0;
  const client = {
    async listCategory() { calls++; return { files: pages, complete: true }; },
    async downloadSvg() { calls++; return SAFE_SVG; },
  };
  const prior = { schema: 'commons-import-manifest/1', entries: [], rejected: [], halted: { reason: 'http-429', retryAt: '2030-01-01T00:10:00.000Z' } };
  const t = Date.parse('2030-01-01T00:00:00Z');
  const blocked = await runImport({ client, categories: ['C'], prior, now: () => t });
  assert.equal(calls, 0);
  assert.equal(blocked.report.blocked.reason, 'cooldown-active');
  assert.equal(blocked.manifest.halted.retryAt, prior.halted.retryAt, 'cool-down record preserved');
  const later = await runImport({ client, categories: ['C'], prior, now: () => t + 11 * 60000 });
  assert.ok(calls > 0);
  assert.equal(later.report.blocked, undefined);
});

test('503 with Retry-After halts like 429; 503 without it is a plain error', async () => {
  const mk = (headers) => createClient({ userAgent: 't (x)', minIntervalMs: 0, fetchImpl: async () => ({ ok: false, status: 503, headers: new Headers(headers) }) });
  const c = mk({ 'retry-after': '90' });
  await assert.rejects(c.listTitles(['File:A.svg']), (e) => e instanceof RateLimited && e.status === 503 && e.retryAfterSeconds === 90 && !!e.retryAt);
  await assert.rejects(c.listTitles(['File:B.svg']), RateLimited);
  await assert.rejects(mk({}).listTitles(['File:A.svg']), (e) => !(e instanceof RateLimited) && /http-503/.test(e.message));
});

test('report states titlesRequested so title counts are reconcilable', async () => {
  const client = { async listCategory() { return { files: [], complete: true }; }, async listTitles(t) { return { files: [...new Set(t)].map((title) => ({ title, missing: true })), complete: true }; }, async downloadSvg() { return SAFE_SVG; } };
  const { report } = await runImport({ client, titles: ['File:A.svg', 'File:A.svg', 'File:B.svg'] });
  assert.equal(report.titlesRequested, 2);
  assert.equal(report.missing, 2);
});
