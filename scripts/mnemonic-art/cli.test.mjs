// CLI-level guards. Offline: --mock only, synthetic output in a temp dir, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = new URL('./cli.mjs', import.meta.url).pathname;
const go = (out, ...args) =>
  spawnSync(process.execPath, [cli, ...args, '--out', out], { encoding: 'utf8', env: {} });

test('--expect-manifest none/existing blocks a fresh ledger and a duplicate first run', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ma-cli-')), 'o');
  const missing = go(out, 'plan', '--only', '山', '--expect-manifest', 'existing');
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /refusing to start a fresh spend ledger/);

  const first = go(
    out,
    'generate',
    '--only',
    '山',
    '--mock',
    '--max-spend-usd',
    '1',
    '--expect-manifest',
    'none',
  );
  assert.equal(first.status, 0, first.stderr);
  assert.ok(existsSync(join(out, 'manifest.json')));

  const again = go(out, 'generate', '--only', '山', '--mock', '--expect-manifest', 'none');
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /must be a first run/);

  const resumed = go(out, 'plan', '--only', '山', '--expect-manifest', 'existing');
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.notEqual(go(out, 'plan', '--only', '山', '--expect-manifest', 'bogus').status, 0);
});

test('live run records run id and commit in manifest provenance (mock)', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ma-cli-')), 'o');
  const r = go(
    out,
    'generate',
    '--only',
    '山',
    '--mock',
    '--max-spend-usd',
    '1',
    '--run-id',
    '123',
    '--commit',
    'abc',
  );
  assert.equal(r.status, 0, r.stderr);
  const m = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  assert.equal(m.runs.length, 1);
  assert.equal(m.runs[0].runId, '123');
  assert.equal(m.runs[0].commit, 'abc');
});

test('live without pricing gates is refused before any call', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ma-cli-')), 'o');
  const r = go(out, 'generate', '--only', '山', '--live', '--max-spend-usd', '1');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /live blocked/);
  assert.ok(!existsSync(join(out, 'manifest.json')));
});
