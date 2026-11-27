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
  assert.match(code, /environment: mnemonic-art-production/);
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
    { IN_BUDGET: '11' },
    { IN_BUDGET: '5; rm' },
  ])
    assert.notEqual(go(bad), 0, JSON.stringify(bad));
});

const cli = (args) =>
  spawnSync('node', ['scripts/mnemonic-art/cli.mjs', ...args], {
    cwd: new URL('../../', import.meta.url),
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
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
  assert.match(r.stderr, /carried manifest has 1 stored/);
});
