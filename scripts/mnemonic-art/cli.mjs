#!/usr/bin/env node
// Usage: node scripts/mnemonic-art/cli.mjs <review|plan|generate|verify> [flags]
// Default is DRY-RUN. Real provider calls need --live AND verified pricing AND --max-spend-usd.
// Flags: --only 山,水 | --ids 1-10 | --all   --force   --mock   --live
//        --max-spend-usd N   --max-retries N(0-3)   --out DIR (default .mnemonic-art)
// Env (live only; never printed): MNEMONIC_IMAGE_API_KEY, MNEMONIC_IMAGE_MODEL,
//        MNEMONIC_PRICE_USD_PER_IMAGE, MNEMONIC_PRICING_SOURCE_URL, MNEMONIC_PRICING_VERIFIED_ON (YYYY-MM-DD)
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import {
  loadDataset,
  reviewDataset,
  select,
  run,
  verify,
  localStorage,
  openaiProvider,
  sharpOptimizer,
  sha256,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
} from './lib.mjs';

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    only: { type: 'string' },
    ids: { type: 'string' },
    all: { type: 'boolean' },
    force: { type: 'boolean' },
    mock: { type: 'boolean' },
    live: { type: 'boolean' },
    'max-spend-usd': { type: 'string' },
    'max-retries': { type: 'string' },
    out: { type: 'string', default: '.mnemonic-art' },
    dataset: { type: 'string', default: 'apps/web/src/hanzi/beginner200.json' },
  },
});
const cmd = positionals[0] ?? 'plan';
const data = loadDataset(a.dataset);
const manifestPath = join(a.out, 'manifest.json');
const storage = localStorage(join(a.out, 'store'));

if (cmd === 'review') {
  const issues = reviewDataset(data);
  for (const i of issues) console.log(`${i.severity}\t#${i.id} ${i.hanzi}: ${i.issue}`);
  const errors = issues.filter((i) => i.severity === 'error');
  console.log(`${errors.length} error(s), ${issues.length - errors.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
if (cmd === 'verify') {
  const bad = await verify({ manifestPath, storage });
  bad.forEach((b) => console.log(b));
  console.log(bad.length ? `${bad.length} problem(s)` : 'all stored entries verified');
  process.exit(bad.length ? 1 : 0);
}
if (cmd !== 'plan' && cmd !== 'generate') throw new Error(`unknown command ${cmd}`);
if (!a.only && !a.ids && !a.all)
  throw new Error('explicit selection required: --only, --ids or --all');

const selection = select(data, a);
let live = cmd === 'generate' && !!a.live;
let provider,
  optimize,
  unitPriceUsd = 0;
if (a.mock) {
  // Synthetic stand-in, clearly NOT artwork. Stays in the gitignored out dir.
  live = cmd === 'generate';
  provider = {
    name: 'mock',
    model: 'mock',
    generate: async (p) => Buffer.from(`MOCK:${sha256(Buffer.from(p))}`),
  };
  optimize = async (b) => ({
    body: Buffer.concat([Buffer.from('RIFF....WEBP'), b]),
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  });
  unitPriceUsd = 0.01;
} else if (live) {
  const env = process.env;
  const price = Number(env.MNEMONIC_PRICE_USD_PER_IMAGE);
  if (
    !(price > 0) ||
    !env.MNEMONIC_PRICING_SOURCE_URL?.startsWith('https://') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(env.MNEMONIC_PRICING_VERIFIED_ON ?? '')
  )
    throw new Error(
      'live blocked: set MNEMONIC_PRICE_USD_PER_IMAGE, MNEMONIC_PRICING_SOURCE_URL (https) and MNEMONIC_PRICING_VERIFIED_ON (YYYY-MM-DD) after verifying provider pricing',
    );
  if (!env.MNEMONIC_IMAGE_MODEL) throw new Error('live blocked: set MNEMONIC_IMAGE_MODEL');
  unitPriceUsd = price;
  provider = openaiProvider({
    apiKey: env.MNEMONIC_IMAGE_API_KEY,
    model: env.MNEMONIC_IMAGE_MODEL,
  });
  optimize = await sharpOptimizer();
}
const result = await run({
  data,
  selection,
  manifestPath,
  storage,
  provider,
  optimize,
  live,
  force: !!a.force,
  maxSpendUsd: Number(a['max-spend-usd'] ?? 0),
  unitPriceUsd,
  maxRetries: Number(a['max-retries'] ?? 2),
  log: console.log,
});
console.log(JSON.stringify(result.summary));
for (const p of result.plan) console.log(`${p.action}\t${p.hanzi}\t${p.file}`);
if (!live) console.log('DRY-RUN: no provider call, no files written.');
