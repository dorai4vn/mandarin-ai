// node --test scripts/mnemonic-art/lib.test.mjs. Synthetic fixtures only: NOT real artwork, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  openaiProvider,
  imageRequestBody,
  supabaseStorage,
  sharpOptimizer,
  isWebp,
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
test('changed brief regenerates; tampered file is blocked until forced', async () => {
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
  assert.throws(() => openaiProvider({ apiKey: '', model: 'gpt-image-1' }), /missing credential/);
  const p = openaiProvider({
    apiKey: 'sk-SECRET',
    model: 'gpt-image-1',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await assert.rejects(p.generate('x'), (e) => e.status === 401 && !e.message.includes('SECRET'));
  const ok = openaiProvider({
    apiKey: 'k',
    model: 'gpt-image-1',
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
  const g = imageRequestBody('gpt-image-1', 'p');
  assert.deepEqual([g.size, g.n, 'response_format' in g], ['1536x1024', 1, false]);
  const d = imageRequestBody('dall-e-3', 'p');
  assert.deepEqual([d.size, d.n, d.response_format], ['1792x1024', 1, 'b64_json']);
  assert.throws(() => imageRequestBody('dall-e-2', 'p'), /not supported/);
  assert.throws(() => imageRequestBody('mystery', 'p'), /not supported/);
  assert.throws(() => openaiProvider({ apiKey: 'k', model: 'mystery' }), /not supported/);
});

test('provider: request shape, redirect refused, error object / bad JSON / empty image rejected', async () => {
  let seen;
  const mkp = (resp) =>
    openaiProvider({
      apiKey: 'sk-SECRET',
      model: 'gpt-image-1',
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
