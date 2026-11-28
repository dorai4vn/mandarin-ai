#!/usr/bin/env node
// Usage: node scripts/mnemonic-art/cli.mjs <review|plan|generate|verify> [flags]
// Default is DRY-RUN. Real provider calls need --live AND verified pricing AND --max-spend-usd.
// Flags: --only 山,水 | --ids 1-10 | --all   --force   --mock   --live
//        --storage local|supabase (default local; supabase needs MNEMONIC_SUPABASE_URL/_SECRET_KEY/_BUCKET)
//        --expect-manifest existing|none  (refuse to run unless a prior manifest exists / does not exist: stops a fresh
//        manifest from silently resetting cumulative spend)   --run-id ID --commit SHA (recorded in manifest provenance)
//        --production --batch-size N(1-200, default 25)  240-new-active mode: needs the 10 retained images (6 active + 4 archive) + run history verified, retries 0,
//        stops on first error, failed entries need --force, cumulative estimated sanity ceiling 6 (NOT a provider cap; owner budget = --max-spend-usd)
//        --revise  allow regenerating ONLY the selected, already-stored characters whose prompt changed (QC revision; old image
//        is archived under mnemonic/superseded/ and kept in entry.history; not allowed with --production)
//        --recover-file F --recover-expect-error TEXT  (production only, both required) retry exactly ONE failed entry once; refused unless it is
//        failed with that error text, 1 attempt, never recovered. Failed attempt is kept in entry.failedAttempts; no --force.
//        --max-spend-usd N   --max-retries N(0-3)   --out DIR (default .mnemonic-art)
// Env (live, and production `plan` for the non-secret pricing vars; never printed): MNEMONIC_IMAGE_API_KEY, MNEMONIC_IMAGE_MODEL,
//        MNEMONIC_INPUT_USD_PER_M, MNEMONIC_OUTPUT_USD_PER_M, MNEMONIC_MAX_INPUT_TOKENS, MNEMONIC_MAX_OUTPUT_TOKENS,
//        MNEMONIC_IMAGE_QUALITY (low|medium|high), MNEMONIC_PRICING_SOURCE_URL, MNEMONIC_PRICING_VERIFIED_ON (YYYY-MM-DD)
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  loadDataset,
  reviewDataset,
  select,
  run,
  verify,
  localStorage,
  supabaseStorage,
  openaiProvider,
  sharpOptimizer,
  sha256,
  loadManifest,
  saveManifest,
  tokenCostBound,
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
    storage: { type: 'string', default: 'local' },
    live: { type: 'boolean' },
    'max-spend-usd': { type: 'string' },
    'max-retries': { type: 'string' },
    'expect-manifest': { type: 'string' },
    'run-id': { type: 'string' },
    commit: { type: 'string' },
    production: { type: 'boolean' },
    revise: { type: 'boolean' },
    'batch-size': { type: 'string' },
    'recover-file': { type: 'string' },
    'recover-expect-error': { type: 'string' },
    out: { type: 'string', default: '.mnemonic-art' },
    dataset: { type: 'string', default: 'apps/web/src/hanzi/beginner200.json' },
  },
});
const cmd = positionals[0] ?? 'plan';
if (!!a['recover-file'] !== !!a['recover-expect-error'])
  throw new Error('--recover-file and --recover-expect-error must be given together');
if (a['recover-file'] && !a.production) throw new Error('--recover-file requires --production');
const data = loadDataset(a.dataset);
const manifestPath = join(a.out, 'manifest.json');
if (a['expect-manifest'] !== undefined) {
  if (!['existing', 'none'].includes(a['expect-manifest']))
    throw new Error('--expect-manifest must be existing|none');
  const exists = existsSync(manifestPath);
  if (a['expect-manifest'] === 'existing' && !exists)
    throw new Error('manifest expected but missing: refusing to start a fresh spend ledger');
  if (a['expect-manifest'] === 'none' && exists)
    throw new Error('manifest unexpectedly present: this must be a first run');
}
if (a.production && a['expect-manifest'] !== 'existing')
  throw new Error('--production requires --expect-manifest existing (carried pilot manifest)');
if (!['local', 'supabase'].includes(a.storage)) throw new Error('--storage must be local|supabase');
if (a.storage === 'supabase' && a.mock) throw new Error('--mock never uses cloud storage');
const storage =
  a.storage === 'supabase'
    ? supabaseStorage({
        url: process.env.MNEMONIC_SUPABASE_URL,
        secretKey: process.env.MNEMONIC_SUPABASE_SECRET_KEY,
        bucket: process.env.MNEMONIC_SUPABASE_BUCKET,
      })
    : localStorage(join(a.out, 'store'));

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
} else if (live || (a.production && cmd === 'plan')) {
  // Same NON-SECRET pricing validation for live and the pre-secret production plan (the API key is only read when live).
  const env = process.env;
  // Token-priced models: per-call ceiling from owner-verified rates + token ceilings (not a fixed unit price).
  if (
    !env.MNEMONIC_PRICING_SOURCE_URL?.startsWith('https://') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(env.MNEMONIC_PRICING_VERIFIED_ON ?? '')
  )
    throw new Error(
      `${live ? 'live blocked' : 'production plan blocked'}: set MNEMONIC_PRICING_SOURCE_URL (https) and MNEMONIC_PRICING_VERIFIED_ON (YYYY-MM-DD) after verifying provider pricing`,
    );
  const price = tokenCostBound({
    inputUsdPerM: env.MNEMONIC_INPUT_USD_PER_M,
    outputUsdPerM: env.MNEMONIC_OUTPUT_USD_PER_M,
    maxInputTokens: env.MNEMONIC_MAX_INPUT_TOKENS,
    maxOutputTokens: env.MNEMONIC_MAX_OUTPUT_TOKENS,
  });
  unitPriceUsd = price;
  if (live) {
    if (!env.MNEMONIC_IMAGE_MODEL) throw new Error('live blocked: set MNEMONIC_IMAGE_MODEL');
    provider = openaiProvider({
      apiKey: env.MNEMONIC_IMAGE_API_KEY,
      model: env.MNEMONIC_IMAGE_MODEL,
      quality: env.MNEMONIC_IMAGE_QUALITY || 'medium',
    });
    optimize = await sharpOptimizer();
  }
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
  maxRetries: Number(a['max-retries'] ?? (a.production ? 0 : 2)),
  production: !!a.production,
  revise: !!a.revise,
  recover: a['recover-file']
    ? { file: a['recover-file'], expectedError: a['recover-expect-error'], runId: a['run-id'] }
    : undefined,
  maxImages: Number(a['batch-size'] ?? 25),
  rates:
    live && !a.mock
      ? {
          inputUsdPerM: Number(process.env.MNEMONIC_INPUT_USD_PER_M),
          outputUsdPerM: Number(process.env.MNEMONIC_OUTPUT_USD_PER_M),
        }
      : undefined,
  log: console.log,
});
if (live && (a['run-id'] || a.commit)) {
  const m = loadManifest(manifestPath);
  (m.runs ??= []).push({
    runId: a['run-id'] ?? null,
    commit: a.commit ?? null,
    spentUsdEstimatedAfter: m.spentUsdEstimated,
    only: a.only ?? a.ids ?? 'all',
  });
  saveManifest(manifestPath, m);
}
console.log(JSON.stringify(result.summary));
for (const p of result.plan) console.log(`${p.action}\t${p.hanzi}\t${p.file}`);
if (!live) console.log('DRY-RUN: no provider call, no files written.');
// Fail-loud: a production live run that failed or stopped early must not look green (artifact is still uploaded by the workflow).
if (live && a.production && (result.summary.failed > 0 || result.summary.stoppedEarly))
  process.exit(2);
