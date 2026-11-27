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
  const r = await run(base(t, mk(1), { live: true, maxRetries: 2, maxSpendUsd: 5 }));
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
  assert.throws(() => openaiProvider({ apiKey: '', model: 'm' }), /missing credential/);
  const p = openaiProvider({
    apiKey: 'sk-SECRET',
    model: 'm',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await assert.rejects(p.generate('x'), (e) => e.status === 401 && !e.message.includes('SECRET'));
  const ok = openaiProvider({
    apiKey: 'k',
    model: 'm',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from('hi').toString('base64') }] }),
    }),
  });
  assert.equal((await ok.generate('x')).toString(), 'hi');
  assert.equal(sha256(Buffer.from('')).length, 64);
  readFileSync;
});
