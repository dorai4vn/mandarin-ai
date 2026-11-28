// node --test scripts/mnemonic-art/lib.test.mjs. Synthetic fixtures only: NOT real artwork, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  run,
  select,
  reviewDataset,
  localStorage,
  verify,
  loadManifest,
  saveManifest,
  sha256,
  buildPrompt,
  promptHash,
  openaiProvider,
  imageRequestBody,
  tokenCostBound,
  usageCost,
  supabaseStorage,
  sharpOptimizer,
  isWebp,
  isActive,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
} from './lib.mjs';

const mk = (n = 3) => ({
  meta: { artworkStyle: 'STYLE' },
  characters: Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    hanzi: '山水木火日'[i],
    meaningVi: 'núi',
    examples: [{ zh: `${'山水木火日'[i]}们`, vi: 'x' }],
    artwork: {
      file: `f${i + 1}.webp`,
      brief: 'A stone bridge over a misty river at dawn with mossy wooden railings and soft light.',
    },
  })),
});
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'mn-'));
  let calls = 0;
  const provider = {
    name: 'mock',
    model: 'm',
    generate: async () => {
      calls++;
      return Buffer.from('raw');
    },
  };
  const optimize = async (b) => ({
    body: Buffer.concat([Buffer.from('RIFF....WEBP'), b]),
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  });
  return {
    dir,
    manifestPath: join(dir, 'm.json'),
    storage: localStorage(join(dir, 's')),
    provider,
    optimize,
    calls: () => calls,
  };
};
const base = (t, data, extra = {}) => ({
  data,
  selection: data.characters,
  manifestPath: t.manifestPath,
  storage: t.storage,
  provider: t.provider,
  optimize: t.optimize,
  unitPriceUsd: 0.1,
  maxSpendUsd: 1,
  sleep: async () => {},
  ...extra,
});

test('dry-run (default) makes no calls and writes nothing', async () => {
  const t = setup();
  const r = await run(base(t, mk(), { live: false }));
  assert.equal(t.calls(), 0);
  assert.equal(r.summary.toGenerate, 3);
  assert.equal(loadManifest(t.manifestPath).spentUsdEstimated, 0);
});
test('generates, verifies checksum, and a rerun makes no duplicate requests', async () => {
  const t = setup();
  const d = mk();
  const r = await run(base(t, d, { live: true }));
  assert.equal(r.summary.generated, 3);
  assert.equal(t.calls(), 3);
  assert.deepEqual(await verify({ manifestPath: t.manifestPath, storage: t.storage }), []);
  const r2 = await run(base(t, d, { live: true }));
  assert.equal(r2.summary.skipped, 3);
  assert.equal(t.calls(), 3);
});
test('explicit regenerate only with force, only selected', async () => {
  const t = setup();
  const d = mk();
  await run(base(t, d, { live: true }));
  await run(base(t, d, { live: true, force: true, selection: [d.characters[1]] }));
  assert.equal(t.calls(), 4);
});
test('tampered file is blocked until forced', async () => {
  const t = setup();
  const d = mk(1);
  await run(base(t, d, { live: true }));
  await t.storage.put('mnemonic/f1.webp', Buffer.from('tampered'));
  const r = await run(base(t, d, { live: true }));
  assert.equal(r.summary.blocked, 1);
  assert.equal(t.calls(), 1);
  assert.match(
    (await verify({ manifestPath: t.manifestPath, storage: t.storage }))[0],
    /checksum mismatch/,
  );
});
test('unresolved "requested" entry (possible crash after billing) is never re-requested', async () => {
  const t = setup();
  const d = mk(1);
  saveManifest(t.manifestPath, {
    version: 1,
    spentUsdEstimated: 0.1,
    entries: { 'f1.webp': { status: 'requested' } },
  });
  const r = await run(base(t, d, { live: true }));
  assert.equal(r.summary.blocked, 1);
  assert.equal(t.calls(), 0);
});
test('spend guard refuses up-front and counts cumulative spend', async () => {
  const t = setup();
  await assert.rejects(run(base(t, mk(3), { live: true, maxSpendUsd: 0.25 })), /spend guard/);
  assert.equal(t.calls(), 0);
  await assert.rejects(run(base(t, mk(1), { live: true, maxSpendUsd: 0 })), /max-spend/);
  await assert.rejects(run(base(t, mk(1), { live: true, unitPriceUsd: 0 })), /verified unit price/);
});
test('retries are bounded, counted toward spend, then fail without more calls', async () => {
  const t = setup();
  let n = 0;
  t.provider.generate = async () => {
    n++;
    throw Object.assign(new Error('x'), { status: 503 });
  };
  const r = await run(base(t, mk(1), { live: true, maxRetries: 2, maxSpendUsd: 1 }));
  assert.equal(n, 3);
  assert.equal(r.summary.failed, 1);
  assert.ok(Math.abs(loadManifest(t.manifestPath).spentUsdEstimated - 0.3) < 1e-9);
  await assert.rejects(run(base(t, mk(1), { live: true, maxRetries: 9 })), /maxRetries/);
});
test('non-retryable 4xx does not retry; cap stops mid-run', async () => {
  const t = setup();
  let n = 0;
  t.provider.generate = async () => {
    n++;
    throw Object.assign(new Error('x'), { status: 400 });
  };
  await run(base(t, mk(1), { live: true }));
  assert.equal(n, 1);
});
test('bad optimizer output (wrong dims / not webp) is rejected and never stored', async () => {
  const t = setup();
  const d = mk(1);
  t.optimize = async () => ({ body: Buffer.from('RIFF....WEBPx'), width: 800, height: 600 });
  const r = await run(base(t, d, { live: true }));
  assert.equal(r.summary.failed, 1);
  assert.equal(await t.storage.get('mnemonic/f1.webp'), null);
});
test('selection must be explicit and valid; storage confined to root', async () => {
  const d = mk();
  assert.deepEqual(select(d, {}), []);
  assert.equal(select(d, { only: '山,水' }).length, 2);
  assert.equal(select(d, { ids: '1-3' }).length, 3);
  assert.throws(() => select(d, { only: '龙' }), /unknown/);
  assert.throws(() => select(d, { ids: 'x' }), /bad id/);
  await assert.rejects(localStorage(setup().dir).put('../evil', Buffer.from('x')), /escapes/);
});
test('review flags weak/abstract briefs and Hanzi in briefs, passes good ones', () => {
  const d = mk(3);
  d.characters[0].artwork.brief = 'short';
  d.characters[1].artwork.brief =
    'An abstract concept of a feeling of goodness shown as a symbol of something big.';
  d.characters[2].artwork.brief += ' 山';
  const msgs = reviewDataset(d)
    .filter((i) => i.severity === 'error')
    .map((i) => i.issue)
    .join('|');
  assert.match(msgs, /too short/);
  assert.match(msgs, /abstract/);
  assert.match(msgs, /contains Hanzi/);
});
test('prompt forbids text; provider needs credential and never leaks it', async () => {
  assert.match(buildPrompt(mk(1).characters[0], { artworkStyle: 'S' }), /no text/i);
  assert.throws(
    () => openaiProvider({ apiKey: '', model: 'gpt-image-2.6-flare' }),
    /missing credential/,
  );
  const p = openaiProvider({
    apiKey: 'sk-SECRET',
    model: 'gpt-image-2.6-flare',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await assert.rejects(p.generate('x'), (e) => e.status === 401 && !e.message.includes('SECRET'));
  const ok = openaiProvider({
    apiKey: 'k',
    model: 'gpt-image-2.6-flare',
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({ data: [{ b64_json: Buffer.from('hi').toString('base64') }] }),
    }),
  });
  assert.equal((await ok.generate('x')).toString(), 'hi');
  assert.equal(sha256(Buffer.from('')).length, 64);
  readFileSync;
});

// ---- Task: pilot-readiness (offline) ----
test('real sharp optimization: synthetic PNG -> exact 1600x1200 WebP', async () => {
  const sharp = (await import('sharp')).default;
  // Synthetic fixture (flat colour 3:2 image) - NOT artwork.
  const png = await sharp({
    create: { width: 1536, height: 1024, channels: 3, background: '#3a5a78' },
  })
    .png()
    .toBuffer();
  const optimize = await sharpOptimizer();
  const { body, width, height } = await optimize(png);
  assert.equal(width, IMAGE_WIDTH);
  assert.equal(height, IMAGE_HEIGHT);
  assert.ok(isWebp(body, IMAGE_WIDTH, IMAGE_HEIGHT, { width, height }));
  const meta = await sharp(body).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 1600, 1200]);
  await assert.rejects(optimize(Buffer.from('not an image')));
});

test('OpenAI request contract per documented model family; unknown/square models rejected', () => {
  const g = imageRequestBody('gpt-image-2.6-flare', 'p');
  assert.deepEqual([g.size, g.n, 'response_format' in g], ['1536x1024', 1, false]);
  for (const m of [
    'gpt-image-1',
    'gpt-image-1-mini',
    'dall-e-3',
    'dall-e-2',
    'chatgpt-image-latest',
  ])
    assert.throws(() => imageRequestBody(m, 'p'), /not supported/);
  for (const m of ['gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.6-sunburst'])
    assert.equal(imageRequestBody(m, 'p').quality, 'medium');
  assert.throws(() => imageRequestBody('gpt-image-2.6-flare', 'p', { quality: 'max' }), /quality/);
  assert.throws(() => imageRequestBody('mystery', 'p'), /not supported/);
  assert.throws(() => openaiProvider({ apiKey: 'k', model: 'mystery' }), /not supported/);
});

test('provider: request shape, redirect refused, error object / bad JSON / empty image rejected', async () => {
  let seen;
  const mkp = (resp) =>
    openaiProvider({
      apiKey: 'sk-SECRET',
      model: 'gpt-image-2.6-flare',
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return resp;
      },
    });
  const okText = JSON.stringify({ data: [{ b64_json: Buffer.from('img').toString('base64') }] });
  assert.equal(
    (await mkp({ ok: true, text: async () => okText }).generate('hello')).toString(),
    'img',
  );
  assert.equal(seen.url, 'https://api.openai.com/v1/images/generations');
  assert.equal(seen.init.redirect, 'error');
  assert.equal(seen.init.headers.authorization, 'Bearer sk-SECRET');
  assert.equal(JSON.parse(seen.init.body).prompt, 'hello');
  for (const text of [
    '<html>',
    JSON.stringify({ error: { message: 'x' }, data: [] }),
    '{"data":[{"b64_json":""}]}',
    '{"data":[]}',
  ])
    await assert.rejects(mkp({ ok: true, text: async () => text }).generate('x'));
  await assert.rejects(
    mkp({ ok: false, status: 429, headers: new Headers({ 'retry-after': '5' }) }).generate('x'),
    (e) => e.status === 429 && e.retryAfter === '5',
  );
});

/** In-memory mock of the Supabase Storage REST surface. */
const mockSupabase = (opts = {}) => {
  const objs = new Map();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const m = /\/storage\/v1\/object\/(authenticated\/)?([^/]+)\/(.+)$/.exec(url);
    const key = `${m[2]}/${m[3]}`;
    if (init.method === 'POST') {
      if (opts.failPut) return new Response('no', { status: 500 });
      if (objs.has(key)) return new Response('dup', { status: 409 });
      objs.set(key, Buffer.from(init.body));
      return new Response('{}', { status: 200 });
    }
    if (!objs.has(key)) return new Response('{"error":"not_found"}', { status: 400 });
    const v = opts.corruptGet ? Buffer.from('tampered') : objs.get(key);
    return new Response(v, { status: 200 });
  };
  return { objs, calls, fetchImpl };
};
const sb = (m, key = 'sb_secret_TEST') =>
  supabaseStorage({
    url: 'https://x.supabase.co/',
    secretKey: key,
    bucket: 'mnemonic-art',
    fetchImpl: m.fetchImpl,
  });

test('supabase storage (mock transport): put/get contract, headers, path safety', async () => {
  const m = mockSupabase();
  const st = sb(m);
  await st.put('mnemonic/a.webp', Buffer.from('abc'), 'image/webp');
  const put = m.calls[0];
  assert.equal(put.url, 'https://x.supabase.co/storage/v1/object/mnemonic-art/mnemonic/a.webp');
  assert.equal(put.init.headers.apikey, 'sb_secret_TEST');
  assert.equal(put.init.headers.Authorization, undefined);
  assert.equal(put.init.headers['x-upsert'], 'false');
  assert.equal(put.init.redirect, 'error');
  assert.equal((await st.get('mnemonic/a.webp')).toString(), 'abc');
  assert.equal(await st.get('mnemonic/none.webp'), null);
  const legacy = sb(m, 'eyJhbGciOi');
  await legacy.put('mnemonic/b.webp', Buffer.from('b'), 'image/webp');
  assert.equal(m.calls.at(-1).init.headers.Authorization, 'Bearer eyJhbGciOi');
  await assert.rejects(st.put('../x', Buffer.from('b'), 'image/webp'), /invalid path/);
  assert.throws(
    () => supabaseStorage({ url: 'http://x', secretKey: 'k', bucket: 'b' }),
    /https url/,
  );
});

test('run() with supabase mock storage: checksum readback stored; corrupt readback fails; no cloud in dry-run', async () => {
  const t = setup();
  const m = mockSupabase();
  const data = mk(1);
  const dry = await run(base(t, data, { storage: sb(m), live: false }));
  assert.equal(m.calls.length, 0);
  assert.equal(dry.summary.toGenerate, 1);
  const r = await run(base(t, data, { storage: sb(m), live: true }));
  assert.equal(r.summary.generated, 1);
  assert.equal(loadManifest(t.manifestPath).entries['f1.webp'].status, 'stored');
  assert.equal(
    await verify({ manifestPath: t.manifestPath, storage: sb(m) }).then((b) => b.length),
    0,
  );
  // rerun: verified via readback, no new provider call
  const calls = t.calls();
  await run(base(t, data, { storage: sb(m), live: true }));
  assert.equal(t.calls(), calls);

  const t2 = setup();
  const bad = mockSupabase({ corruptGet: true });
  const r2 = await run(base(t2, mk(1), { storage: sb(bad), live: true }));
  assert.equal(r2.summary.failed, 1);
  assert.match(loadManifest(t2.manifestPath).entries['f1.webp'].error, /checksum/);
  const t3 = setup();
  const r3 = await run(
    base(t3, mk(1), { storage: sb(mockSupabase({ failPut: true })), live: true }),
  );
  assert.equal(r3.summary.failed, 1);
  assert.equal(t3.calls(), 1); // failed upload is fatal: no re-billed retry
});

test('pilot cost bound: 10 images incl. retries stay within $1 or are refused up-front', async () => {
  const t = setup();
  const d = mk(5);
  d.characters.push(
    ...mk(5).characters.map((c, i) => ({
      ...c,
      id: 6 + i,
      artwork: { ...c.artwork, file: `g${i}.webp` },
    })),
  );
  // 10 x $0.05 x (1+1 retry) = $1.00 worst case -> allowed
  const ok = await run(
    base(t, d, { live: false, unitPriceUsd: 0.05, maxRetries: 1, maxSpendUsd: 1 }),
  );
  assert.equal(ok.summary.worstCaseUsd, 1);
  // $0.10 x 10 = $1.00 but cumulative guard counts first attempts: allowed; at $0.11 refused
  await assert.rejects(
    run(base(setup(), d, { live: true, unitPriceUsd: 0.11, maxSpendUsd: 1 })),
    /spend guard/,
  );
});

test('live pilot caps: max spend $1 and 10 images enforced in code', async () => {
  await assert.rejects(
    run(base(setup(), mk(1), { live: true, maxSpendUsd: 5, unitPriceUsd: 0.01 })),
    /pilot cap/,
  );
  const d = mk(3);
  d.characters = Array.from({ length: 11 }, (_, i) => ({
    ...d.characters[0],
    id: i + 1,
    artwork: { ...d.characters[0].artwork, file: `h${i}.webp` },
  }));
  await assert.rejects(
    run(base(setup(), d, { live: true, maxSpendUsd: 1, unitPriceUsd: 0.01 })),
    /pilot cap/,
  );
});

test('token cost bound: ceiling from owner-supplied rates; refuses when unbounded', () => {
  // 2000 input tokens @ $5/M + 8000 output tokens @ $30/M = 0.01 + 0.24 (illustrative arithmetic only)
  const r = { inputUsdPerM: 5, outputUsdPerM: 30 };
  assert.equal(tokenCostBound({ ...r, maxInputTokens: 2000, maxOutputTokens: 8000 }), 0.25);
  assert.throws(() => tokenCostBound({ ...r, maxInputTokens: 2000 }), /cannot bound/);
  assert.throws(
    () => tokenCostBound({ ...r, maxInputTokens: 0, maxOutputTokens: 1 }),
    /cannot bound/,
  );
  assert.equal(usageCost({ input_tokens: 1000, output_tokens: 1000 }, r), 0.035);
  assert.equal(usageCost(undefined, r), undefined);
});

// ---- Production (remaining-190) mode: synthetic fixtures, mock provider, no network ----
const seedStored = async (t, d, n) => {
  // pre-populate the carried "pilot" manifest by really generating n items
  await run(base(t, { ...d, characters: d.characters.slice(0, n) }, { live: true }));
};
const prod = (t, d, extra = {}) =>
  base(t, d, {
    live: true,
    production: true,
    maxRetries: 0,
    maxImages: 5,
    maxSpendUsd: 5,
    ...extra,
  });

test('production: refuses without >=10 stored pilot images in the carried manifest', async () => {
  const t = setup();
  await assert.rejects(run(prod(t, mk(5))), /carried manifest has 0 stored/);
  assert.equal(t.calls(), 0);
});
test('production: retries must be 0, batch bounded, sanity ceiling', async () => {
  const t = setup();
  const d = mk(5);
  await assert.rejects(run(prod(t, d, { maxRetries: 1 })), /retries must be 0/);
  await assert.rejects(run(prod(t, d, { maxImages: 0 })), /batch size/);
  await assert.rejects(run(prod(t, d, { maxImages: 201 })), /batch size/);
  await assert.rejects(run(prod(t, d, { maxSpendUsd: 11 })), /sanity ceiling/);
  assert.equal(t.calls(), 0);
});
const big = (n) => {
  const d = mk(1);
  d.characters = Array.from({ length: n }, (_, i) => ({
    ...d.characters[0],
    id: i + 1,
    hanzi: String.fromCodePoint(0x4e00 + i),
    artwork: { ...d.characters[0].artwork, file: `g${i + 1}.webp` },
  }));
  return d;
};
test('production: skips existing, bounded batch, resumes on rerun, no duplicate paid calls', async () => {
  const t = setup();
  const d = big(30);
  await seedStored(t, d, 10);
  assert.equal(t.calls(), 10);
  const r1 = await run(prod(t, d, { maxImages: 8 }));
  assert.equal(r1.summary.generated, 8);
  assert.equal(r1.summary.deferred, 12);
  assert.equal(t.calls(), 18);
  const r2 = await run(prod(t, d, { maxImages: 100 }));
  assert.equal(r2.summary.generated, 12);
  const r3 = await run(prod(t, d));
  assert.equal(r3.summary.generated, 0);
  assert.equal(t.calls(), 30);
  // cumulative spend carried across runs: 30 x 0.1
  assert.ok(Math.abs(loadManifest(t.manifestPath).spentUsdEstimated - 3) < 1e-9);
});
test('production: cumulative spend cap includes carried pilot spend; stops before overspend', async () => {
  const t = setup();
  const d = big(30);
  await seedStored(t, d, 10); // 1.0 spent
  await assert.rejects(run(prod(t, d, { maxImages: 20, maxSpendUsd: 2 })), /spend guard/);
  assert.equal(t.calls(), 10);
});
test('production: stops on first error, failed entry blocked on rerun (no duplicate paid call)', async () => {
  const t = setup();
  const d = big(30);
  await seedStored(t, d, 10);
  let n = 0;
  t.provider.generate = async () => {
    n++;
    if (n === 3) throw Object.assign(new Error('boom'), { status: 500 });
    return Buffer.from('raw');
  };
  const r = await run(prod(t, d, { maxImages: 10 }));
  assert.equal(r.summary.generated, 2);
  assert.equal(r.summary.failed, 1);
  assert.equal(r.summary.stoppedEarly, true);
  assert.equal(n, 3); // no further calls after the error
  const r2 = await run(prod(t, d, { maxImages: 10 }));
  assert.ok(r2.summary.blocked >= 1);
  const failedFile = Object.keys(loadManifest(t.manifestPath).entries).find(
    (k) => loadManifest(t.manifestPath).entries[k].status === 'failed',
  );
  assert.equal(loadManifest(t.manifestPath).entries[failedFile].attempts, 1); // never re-requested
  const m = loadManifest(t.manifestPath);
  assert.equal(Object.values(m.entries).filter((e) => e.status === 'failed').length, 1);
});
test('production: reports actual usage cost when provider returns usage', async () => {
  const t = setup();
  const d = big(12);
  await seedStored(t, d, 10);
  t.provider.generate = async function () {
    t.provider.lastUsage = { input_tokens: 1000, output_tokens: 2000 };
    return Buffer.from('raw');
  };
  const r = await run(prod(t, d, { rates: { inputUsdPerM: 5, outputUsdPerM: 30 } }));
  assert.equal(r.summary.generated, 2);
  assert.ok(Math.abs(r.summary.actualUsdReported - 2 * 0.065) < 1e-9);
});

// ---- QC revision (人 / 雨): frozen v1 prompt keeps accepted hashes; v2 adds thumbnail guidance; revise is explicit ----
const GOLDEN_V1 = {
  'shan-mountain.webp': 'd990f391d0e77600e19a91c5f263440c529e1efd23f4872edadf874426312f80',
  'shui-water.webp': 'c1ab023d11d2f8de1d0562c6a3304a3bdcf82d6a3ca9ec7528bfd7f0d42f60de',
  'mu-tree.webp': '4269139ad4c210f668be6844ea56347b5e1de5ff96d4698351d6b8487305163a',
  'huo-fire.webp': '4772fca257dc227bcf7e4f5285d47f1497255602c0704a9f4ef4b89085c70fc1',
  'ri-sun.webp': '0032cf30af9e63b9c80369cf49533fcc623a7f9de00cd31cef14c77cfcda8c20',
  'yue-moon.webp': '31e9952bdcf6acae131fb2b33768a1cb19d974e61b7b048dec759ef088048c8e',
  'yu-fish.webp': 'bcbf68fb11e75db5a3ace3dc716f8b59c572c6c05fcd6e71464c5e12b361aa67',
  'niao-bird.webp': '51697d219a520c018fc6a9849f54e0b9ea7eb72c284180473737c8bfafcdbf25',
};
const real = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../apps/web/src/hanzi/beginner200.json', import.meta.url)),
    'utf8',
  ),
);
test('the 8 accepted pilot images keep their exact prompt hashes (not invalidated)', () => {
  for (const [file, h] of Object.entries(GOLDEN_V1)) {
    const c = real.characters.find((x) => x.artwork.file === file);
    assert.equal(c.artwork.promptVersion, 'v1', file);
    assert.equal(promptHash(buildPrompt(c, real.meta)), h, file);
    assert.doesNotMatch(buildPrompt(c, real.meta), /Thumbnail legibility/);
  }
});
test('人/雨 are revised v2 prompts; every non-frozen prompt gets thumbnail guidance; no Hanzi in briefs', () => {
  const by = (h) => real.characters.find((c) => c.hanzi === h);
  for (const h of ['人', '雨']) {
    assert.equal(by(h).artwork.promptVersion, 'v2');
    assert.match(buildPrompt(by(h), real.meta), /Thumbnail legibility/);
  }
  assert.match(by('人').artwork.brief, /large, unmistakable human figure/);
  assert.match(by('雨').artwork.brief, /rain/i);
  assert.match(by('雨').artwork.brief, /no lightning/);
  const rest = real.characters.filter((c) => c.artwork.promptVersion !== 'v1');
  assert.equal(rest.length, 278); // 276 not-yet-generated (240 active new + 36 archive never generated) + 人 + 雨
  for (const c of rest) assert.match(buildPrompt(c, real.meta), /Thumbnail legibility/);
  assert.deepEqual(
    reviewDataset(real).filter((i) => i.severity === 'error'),
    [],
  );
});
test('changed prompt over a stored image is blocked without --revise (no silent paid overwrite)', async () => {
  const t = setup();
  const d = mk(2);
  await run(base(t, d, { live: true }));
  d.characters[0].artwork.brief += ' Revised with a much larger subject.';
  const r = await run(base(t, d, { live: true }));
  assert.equal(r.summary.blocked, 1);
  assert.equal(t.calls(), 2);
});
test('--revise regenerates only the selected changed entry, archives the old image, keeps cumulative spend', async () => {
  const t = setup();
  const d = mk(2);
  await run(base(t, d, { live: true }));
  const m1 = loadManifest(t.manifestPath);
  const old = m1.entries['f1.webp'];
  const untouched = JSON.stringify(m1.entries['f2.webp']);
  d.characters[0].artwork.brief += ' Revised with a much larger subject.';
  const r = await run(
    base(t, d, { live: true, revise: true, selection: [d.characters[0]], maxSpendUsd: 1 }),
  );
  assert.equal(r.summary.generated, 1);
  assert.equal(t.calls(), 3);
  const m2 = loadManifest(t.manifestPath);
  assert.equal(JSON.stringify(m2.entries['f2.webp']), untouched);
  assert.equal(m2.spentUsdEstimated, 0.3);
  const e = m2.entries['f1.webp'];
  assert.equal(e.status, 'stored');
  assert.notEqual(e.promptHash, old.promptHash);
  assert.equal(e.history.length, 1);
  assert.equal(e.history[0].sha256, old.sha256);
  const archived = await t.storage.get(e.history[0].archivedAt);
  assert.equal(sha256(archived), old.sha256);
  assert.deepEqual(await verify({ manifestPath: t.manifestPath, storage: t.storage }), []);
  // rerun: skip, no further spend
  const r3 = await run(base(t, d, { live: true, revise: true }));
  assert.equal(r3.summary.skipped, 2);
  assert.equal(t.calls(), 3);
});
test('--revise refuses when the stored file is tampered, and is not allowed in production', async () => {
  const t = setup();
  const d = mk(1);
  await run(base(t, d, { live: true }));
  d.characters[0].artwork.brief += ' Revised.';
  await t.storage.put('mnemonic/f1.webp', Buffer.from('tampered'));
  await assert.rejects(run(base(t, d, { live: true, revise: true })), /checksum mismatch/);
  assert.equal(t.calls(), 1);
  await assert.rejects(
    run(base(t, d, { live: true, revise: true, production: true, maxRetries: 0 })),
    /not allowed in production/,
  );
});

// ---- Scope migration: 246 active (syllabus L1) + 40 archive; carried ledger of the 10 retained images ----
const ACTIVE_OLD = ['水', '火', '日', '月', '人', '雨']; // retained pilot images that are inside the Level 1 list
const ARCHIVE_OLD = ['山', '木', '鱼', '鸟']; // retained pilot images outside it
const by = (h) => real.characters.find((c) => c.hanzi === h);
const PRIOR_RUNS = real.meta.retainedPilot.priorRuns;
const supersededFixture = async (t, h, price) => {
  const body = Buffer.from(`superseded-fixture-${h}`);
  const hash = sha256(body);
  const archivedAt = `mnemonic/superseded/${hash.slice(0, 12)}-${by(h).artwork.file}`;
  await t.storage.put(archivedAt, body);
  return { archivedAt, sha256: hash, priceUsdEstimated: price };
};
/** Synthetic carried manifest for the 10 retained files (bytes are fake fixtures, NOT artwork). */
const carried = async (t, { price = 0.0195 } = {}) => {
  const m = { version: 1, spentUsdEstimated: 0, entries: {} };
  for (const h of [...ACTIVE_OLD, ...ARCHIVE_OLD]) {
    const c = by(h);
    const body = Buffer.concat([Buffer.from('RIFF....WEBP'), Buffer.from(`fixture-${h}`)]);
    await t.storage.put(`mnemonic/${c.artwork.file}`, body);
    m.entries[c.artwork.file] = {
      status: 'stored',
      hanzi: h,
      path: `mnemonic/${c.artwork.file}`,
      sha256: sha256(body),
      promptHash: promptHash(buildPrompt(c, real.meta)),
      priceUsdEstimated: price,
      ...(h === '人' || h === '雨' ? { history: [await supersededFixture(t, h, price)] } : {}),
    };
    m.spentUsdEstimated =
      Math.round((m.spentUsdEstimated + price * (c.artwork.promptVersion === 'v2' ? 2 : 1)) * 1e6) /
      1e6;
  }
  m.runs = PRIOR_RUNS.map((r) => ({ ...r }));
  m.spentUsdEstimated = Math.max(m.spentUsdEstimated, PRIOR_RUNS.at(-1).spentUsdEstimatedAfter);
  saveManifest(t.manifestPath, m);
  return m;
};
const realProd = (t, extra = {}) =>
  base(t, real, {
    selection: select(real, { all: true }),
    live: true,
    production: true,
    maxRetries: 0,
    maxImages: 200,
    maxSpendUsd: 6,
    unitPriceUsd: 0.0195,
    ...extra,
  });

test('dataset migration: --all selects exactly the 246 active; archive only by explicit selection', () => {
  const all = select(real, { all: true });
  assert.equal(real.characters.length, 286);
  assert.equal(all.length, 246);
  assert.ok(all.every(isActive));
  assert.equal(real.characters.filter((c) => !isActive(c)).length, 40);
  for (const h of ARCHIVE_OLD) assert.ok(!all.includes(by(h)), h);
  for (const h of ACTIVE_OLD) assert.ok(all.includes(by(h)), h);
  assert.equal(select(real, { only: '山' })[0].set, 'extension'); // explicit only
  // stable ids and frozen/revised prompt hashes survive the migration
  assert.deepEqual(
    real.characters.map((c) => c.id),
    Array.from({ length: 286 }, (_, i) => i + 1),
  );
  for (const [file, h] of Object.entries(GOLDEN_V1))
    assert.equal(
      promptHash(
        buildPrompt(
          real.characters.find((c) => c.artwork.file === file),
          real.meta,
        ),
      ),
      h,
    );
  assert.deepEqual(
    reviewDataset(real).filter((i) => i.severity === 'error'),
    [],
  );
  assert.equal(new Set(real.characters.map((c) => c.artwork.file)).size, 286);
});
test('production dry-run on real dataset with verified carried ledger plans exactly 240 new images', async () => {
  const t = setup();
  await carried(t);
  const r = await run(realProd(t, { live: false }));
  assert.equal(r.summary.skipped, 6); // 水火日月人雨 retained
  assert.equal(r.summary.toGenerate + r.summary.deferred, 240);
  assert.equal(r.summary.blocked, 0);
  assert.equal(t.calls(), 0);
});
test('production live (mock provider): only new active images are generated, carried spend/entries preserved', async () => {
  const t = setup();
  const before = await carried(t);
  const r = await run(realProd(t, { maxImages: 3 }));
  assert.equal(r.summary.generated, 3);
  assert.equal(t.calls(), 3);
  const after = loadManifest(t.manifestPath);
  assert.ok(Math.abs(after.spentUsdEstimated - (before.spentUsdEstimated + 3 * 0.0195)) < 1e-9);
  for (const [f, e] of Object.entries(before.entries)) assert.deepEqual(after.entries[f], e, f);
  const fresh = Object.keys(after.entries).filter((f) => !before.entries[f]);
  assert.equal(fresh.length, 3);
  for (const f of fresh) assert.ok(isActive(real.characters.find((c) => c.artwork.file === f)));
});
test('production: archive selection is rejected; fail-closed on missing/tampered ledger', async () => {
  const t = setup();
  await carried(t);
  await assert.rejects(
    run(realProd(t, { selection: [by('山')] })),
    /archive records are never generated/,
  );
  assert.equal(t.calls(), 0);
  const tamper = async (mutate, re) => {
    const u = setup();
    const m = await carried(u);
    await mutate(m, u);
    saveManifest(u.manifestPath, m);
    await assert.rejects(run(realProd(u)), re);
    assert.equal(u.calls(), 0);
  };
  const f = (h) => by(h).artwork.file;
  await tamper((m) => delete m.entries[f('山')], /山|shan-mountain.*not stored/);
  await tamper((m) => (m.entries[f('木')].status = 'failed'), /mu-tree.*not stored/);
  await tamper((m) => (m.spentUsdEstimated = 0.01), /lower than .*tampered ledger/);
  await tamper((m) => delete m.entries[f('人')].history, /prior requests/);
  await tamper((m) => (m.entries[f('水')].promptHash = 'b'.repeat(64)), /promptHash differs/);
  await tamper((m) => (m.entries['zzz.webp'] = { status: 'stored' }), /orphan/);
  await tamper((m) => (m.entries[f('火')].sha256 = 'c'.repeat(64)), /checksum mismatch/);
  await tamper(
    async (m, u) => await u.storage.put(`mnemonic/${f('日')}`, Buffer.from('changed')),
    /checksum mismatch/,
  );
  await tamper((m) => (m.entries['new.webp'] = { status: 'requested' }), /orphan/);
  // missing ledger entirely
  const u = setup();
  await assert.rejects(run(realProd(u)), /carried ledger rejected/);
  assert.equal(u.calls(), 0);
});
test('production sanity ceiling is the owner-approved $6 cumulative estimate; spend guard counts carried spend', async () => {
  const t = setup();
  await carried(t);
  await assert.rejects(run(realProd(t, { maxSpendUsd: 6.5 })), /sanity ceiling/);
  // carried ~0.2145 + 240 x 0.0195 = 4.89 < 6 is fine; a $1 cap must refuse up-front
  await assert.rejects(run(realProd(t, { maxSpendUsd: 1 })), /spend guard/);
  assert.equal(t.calls(), 0);
});

test('carried ledger: superseded history files and run-history prefix are verified fail-closed', async () => {
  const tamper = async (mutate, re) => {
    const u = setup();
    const m = await carried(u);
    await mutate(m, u);
    saveManifest(u.manifestPath, m);
    await assert.rejects(run(realProd(u)), re);
    assert.equal(u.calls(), 0);
  };
  const f = (h) => by(h).artwork.file;
  // superseded file missing / tampered / unsafe path / bad checksum
  await tamper(async (m, u) => {
    const h = m.entries[f('人')].history[0];
    await u.storage.put(h.archivedAt, Buffer.from('changed'));
  }, /superseded file .* missing or checksum mismatch/);
  await tamper(
    (m) => (m.entries[f('雨')].history[0].archivedAt = 'mnemonic/superseded/zz-x.webp'),
    /not a safe mnemonic\/superseded path/,
  );
  await tamper(
    (m) => (m.entries[f('雨')].history[0].archivedAt = '../../etc/passwd'),
    /not a safe/,
  );
  await tamper((m) => (m.entries[f('雨')].history[0].sha256 = 'z'), /no valid checksum/);
  await tamper(
    (m) =>
      (m.entries[f('雨')].history[0].archivedAt =
        'mnemonic/superseded/' + 'a'.repeat(12) + '-gone.webp'),
    /no valid checksum|missing or checksum/,
  );
  // run history: missing / reordered / altered
  await tamper((m) => m.runs.pop(), /missing prior run #3/);
  await tamper((m) => delete m.runs, /missing prior run #1/);
  await tamper((m) => m.runs.reverse(), /altered\/reordered/);
  await tamper((m) => (m.runs[0].commit = 'f'.repeat(40)), /commit altered/);
  await tamper((m) => (m.runs[1].only = '山'), /only altered/);
  await tamper((m) => (m.runs[2].spentUsdEstimatedAfter = 0.01), /spentUsdEstimatedAfter altered/);
  await tamper((m) => (m.spentUsdEstimated = 0.2), /below final prior run amount|lower than/);
  // entry vs dataset, price validity
  await tamper((m) => (m.entries[f('水')].hanzi = '火'), /entry hanzi/);
  await tamper((m) => (m.entries[f('水')].path = 'mnemonic/other.webp'), /entry path/);
  await tamper((m) => (m.entries[f('水')].priceUsdEstimated = -1), /price missing\/negative/);
  await tamper((m) => (m.entries[f('水')].priceUsdEstimated = null), /price missing\/negative/);
  await tamper(
    (m) => (m.entries[f('人')].history[0].priceUsdEstimated = Infinity),
    /history price/,
  );
  // later production run records may append without rewriting the prefix; old entries stay byte-for-byte
  const t = setup();
  const before = await carried(t);
  const snapshot = JSON.stringify(before.entries);
  const m = loadManifest(t.manifestPath);
  m.runs.push({ runId: '999', commit: 'c'.repeat(40), spentUsdEstimatedAfter: 0.3, only: 'all' });
  saveManifest(t.manifestPath, m);
  const r = await run(realProd(t, { live: false }));
  assert.equal(r.summary.blocked, 0);
  assert.equal(JSON.stringify(loadManifest(t.manifestPath).entries), snapshot);
});
test('production dry-run validates the budget input like the live step (ceiling, already-spent)', async () => {
  const t = setup();
  await carried(t);
  await assert.rejects(run(realProd(t, { live: false, maxSpendUsd: 7 })), /sanity ceiling/);
  await assert.rejects(
    run(realProd(t, { live: false, maxSpendUsd: 0.1 })),
    /already spent exceeds/,
  );
  const r = await run(realProd(t, { live: false, maxSpendUsd: 6 }));
  assert.equal(r.summary.toGenerate + r.summary.deferred, 240);
  assert.equal(t.calls(), 0);
});
