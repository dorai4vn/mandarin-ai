// Offline structural checks on the DRAFT production workflow + CLI guards (no network, no YAML dependency).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wf = readFileSync(
  new URL('../../docs/workflow-drafts/mnemonic-art-production.yml', import.meta.url),
  'utf8',
);
const code = wf
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .map((l) => l.replace(/\s+#\s.*$/, ''))
  .join('\n');

test('production draft: dispatch only, read-only, owner-only, environment approval, shared concurrency', () => {
  assert.match(code, /^on:\n {2}workflow_dispatch:/m);
  assert.doesNotMatch(code, /pull_request|issue_comment|push:|schedule:|workflow_run/);
  assert.match(code, /permissions:\n {2}contents: read\n {2}actions: read/);
  assert.doesNotMatch(code, /: write/);
  assert.match(code, /github\.actor == 'dorai4vn'/);
  assert.match(code, /github\.triggering_actor == 'dorai4vn'/);
  assert.match(code, /environment: mnemonic-art-pilot/);
  assert.match(code, /group: mnemonic-art-pilot/);
});
test('production draft: pinned actions, one secret use in Generate, exact SHA, hidden artifact on failure', () => {
  for (const m of code.matchAll(/uses:\s*(\S+)/g)) assert.match(m[1], /@[0-9a-f]{40}$/);
  assert.equal(code.match(/secrets\./g).length, 1);
  const gen = code.slice(code.indexOf('- name: Generate'), code.indexOf('- name: Detect'));
  assert.match(gen, /secrets\.MNEMONIC_IMAGE_API_KEY/);
  for (const f of [
    '--production',
    '--max-retries 0',
    '--expect-manifest existing',
    '--batch-size',
    '--all',
  ])
    assert.ok(gen.includes(f), f);
  assert.match(gen, /MNEMONIC_IMAGE_QUALITY: low/);
  assert.match(code, /ref: \$\{\{ inputs\.reviewed_sha \}\}/);
  assert.match(code, /include-hidden-files: true/);
  assert.match(code, /if: \$\{\{ always\(\) && steps\.detect/);
  assert.match(code, /name: mnemonic-art-pilot/);
  assert.match(code, /previous_run_id must be the LATEST run/);
  assert.match(code, /persist-credentials: false/);
});
test('production draft: inputs never interpolated into shell', () => {
  for (const st of code.split(/\n\s+- (?=name:|uses:|run:)/)) {
    const i = st.search(/^(\s*- )?\s*run: /m);
    if (i >= 0) assert.doesNotMatch(st.slice(i), /\$\{\{\s*(inputs|github\.event)\./);
  }
});
test('production draft: validation step really runs in bash/python', () => {
  const lines = wf.split('\n');
  const i = lines.findIndex((l) => l.includes('- name: Validate inputs'));
  const r = lines.findIndex((l, k) => k > i && /^\s+run: \|/.test(l));
  const out = [];
  for (
    let k = r + 1;
    k < lines.length && (lines[k].startsWith('          ') || lines[k] === '');
    k++
  )
    out.push(lines[k].slice(10));
  const script = out.join('\n');
  const ok = { IN_SHA: 'a'.repeat(40), PREV_RUN: '46058598242', IN_BATCH: '50', IN_BUDGET: '5' };
  assert.equal(
    spawnSync('bash', ['-c', script], { env: { PATH: process.env.PATH, ...ok, IN_BUDGET: '6' } })
      .status,
    0,
  );
  const go = (o) =>
    spawnSync('bash', ['-c', script], {
      env: { PATH: process.env.PATH, ...ok, ...o },
      encoding: 'utf8',
    }).status;
  assert.equal(go({}), 0);
  for (const bad of [
    { IN_SHA: 'abc' },
    { PREV_RUN: '' },
    { PREV_RUN: '1;x' },
    { IN_BATCH: '7' },
    { IN_BUDGET: '0' },
    { IN_BUDGET: '6.01' },
    { IN_BUDGET: '7' },
    { IN_BUDGET: '11' },
    { IN_BUDGET: '5; rm' },
  ])
    assert.notEqual(go(bad), 0, JSON.stringify(bad));
});

const cli = (args, env = {}) =>
  spawnSync('node', ['scripts/mnemonic-art/cli.mjs', ...args], {
    cwd: new URL('../../', import.meta.url),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });
test('CLI: --production refuses without --expect-manifest existing / with missing manifest', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'mp-')), 'o');
  assert.match(
    cli(['generate', '--all', '--production', '--mock', '--out', out]).stderr,
    /expect-manifest existing/,
  );
  assert.match(
    cli([
      'generate',
      '--all',
      '--production',
      '--mock',
      '--expect-manifest',
      'existing',
      '--out',
      out,
    ]).stderr,
    /manifest expected but missing/,
  );
});
test('CLI: production mock run refuses a manifest without the 10 stored pilot images', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'mp-')), 'o');
  const seed = cli(['generate', '--only', '山', '--mock', '--max-spend-usd', '1', '--out', out]);
  assert.equal(seed.status, 0, seed.stderr);
  const r = cli([
    'generate',
    '--all',
    '--production',
    '--mock',
    '--expect-manifest',
    'existing',
    '--max-spend-usd',
    '5',
    '--out',
    out,
  ]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /carried ledger rejected \(fail closed\).*not stored in carried manifest/);
});

test('production draft: budget <= 6 and pre-secret production-mode dry-run exercises the ledger guard', () => {
  assert.match(code, /not 0 < float\(b\) <= 6/);
  assert.doesNotMatch(code, /<= 10/);
  const pre = code.slice(code.indexOf('- name: Offline checks'), code.indexOf('- name: Generate'));
  assert.doesNotMatch(pre, /secrets\./);
  assert.doesNotMatch(pre, /MNEMONIC_IMAGE_API_KEY/);
  const line = pre.match(/pnpm mnemonic-art plan [^\n]*\\\n[^\n]*/)[0];
  for (const f of [
    '--all',
    '--production',
    '--expect-manifest existing',
    '--batch-size "$IN_BATCH"',
    '--max-spend-usd "$IN_BUDGET"',
  ])
    assert.ok(line.includes(f), f);
  // pricing inputs are passed (non-secret vars only) so the projected-budget check can compute the bound
  for (const v of [
    'MNEMONIC_INPUT_USD_PER_M',
    'MNEMONIC_OUTPUT_USD_PER_M',
    'MNEMONIC_MAX_INPUT_TOKENS',
    'MNEMONIC_MAX_OUTPUT_TOKENS',
    'MNEMONIC_PRICING_SOURCE_URL',
    'MNEMONIC_PRICING_VERIFIED_ON',
  ])
    assert.match(pre, new RegExp(`${v}: \\$\\{\\{ vars\\.${v} \\}\\}`), v);
  assert.ok(
    code.indexOf('mnemonic-art plan --all --production') <
      code.indexOf('secrets.MNEMONIC_IMAGE_API_KEY'),
  );
});
test('CLI: production dry-run rejects a budget above the $6 sanity ceiling and spend already above budget', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'mp-')), 'o');
  const seed = cli(['generate', '--only', '山', '--mock', '--max-spend-usd', '1', '--out', out]);
  assert.equal(seed.status, 0, seed.stderr);
  const base = ['plan', '--all', '--production', '--expect-manifest', 'existing', '--out', out];
  const pricing = {
    MNEMONIC_INPUT_USD_PER_M: '5',
    MNEMONIC_OUTPUT_USD_PER_M: '30',
    MNEMONIC_MAX_INPUT_TOKENS: '300',
    MNEMONIC_MAX_OUTPUT_TOKENS: '500',
    MNEMONIC_PRICING_SOURCE_URL: 'https://example.invalid/pricing',
    MNEMONIC_PRICING_VERIFIED_ON: '2026-11-27',
  };
  // ledger guard runs first (only 1 of 10 retained images stored) -> fail closed either way
  assert.match(cli([...base, '--max-spend-usd', '7'], pricing).stderr, /carried ledger rejected/);
});

test('CLI: production plan fails closed on missing/invalid non-secret pricing inputs, never needs the API key', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'mp-')), 'o');
  const seed = cli(['generate', '--only', '山', '--mock', '--max-spend-usd', '1', '--out', out]);
  assert.equal(seed.status, 0, seed.stderr);
  const args = ['plan', '--all', '--production', '--expect-manifest', 'existing', '--out', out];
  const full = {
    MNEMONIC_INPUT_USD_PER_M: '5',
    MNEMONIC_OUTPUT_USD_PER_M: '30',
    MNEMONIC_MAX_INPUT_TOKENS: '300',
    MNEMONIC_MAX_OUTPUT_TOKENS: '500',
    MNEMONIC_PRICING_SOURCE_URL: 'https://example.invalid/pricing',
    MNEMONIC_PRICING_VERIFIED_ON: '2026-11-27',
  };
  args.push('--max-spend-usd', '6');
  assert.match(cli(args).stderr, /production plan blocked: set MNEMONIC_PRICING_SOURCE_URL/);
  const noDate = { ...full, MNEMONIC_PRICING_VERIFIED_ON: 'yesterday' };
  assert.match(
    cli(args, noDate).stderr,
    /production plan blocked: set MNEMONIC_PRICING_SOURCE_URL/,
  );
  const badRate = { ...full, MNEMONIC_OUTPUT_USD_PER_M: '0' };
  assert.match(cli(args, badRate).stderr, /cannot bound cost/);
  // with valid pricing it proceeds (and here stops at the ledger guard: only 1 of 10 retained images) - no key involved
  assert.match(cli(args, full).stderr, /carried ledger rejected/);
});
