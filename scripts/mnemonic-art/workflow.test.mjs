// Offline structural checks on the DRAFT workflow (text-based; no YAML dependency, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wf = readFileSync(
  new URL('../../.github/workflows/mnemonic-art-pilot.yml', import.meta.url),
  'utf8',
);
const code = wf
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .map((l) => l.replace(/\s+#\s.*$/, ''))
  .join('\n');

test('only workflow_dispatch; read-only permissions; owner-only on main', () => {
  assert.match(code, /^on:\n {2}workflow_dispatch:/m);
  assert.doesNotMatch(code, /pull_request|issue_comment|push:|schedule:|workflow_run/);
  assert.match(code, /permissions:\n {2}contents: read\n {2}actions: read/);
  assert.doesNotMatch(code, /(contents|actions|id-token|packages|issues|pull-requests): write/);
  assert.match(code, /github\.ref == 'refs\/heads\/main'/);
  assert.match(code, /github\.actor == 'dorai4vn'/);
  assert.match(code, /environment: mnemonic-art-pilot/);
});

test('every action is pinned to a 40-hex SHA', () => {
  const uses = [...code.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 4);
  for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, u);
});

test('secret appears in exactly one step (Generate); checkout uses typed exact SHA', () => {
  assert.equal(code.match(/secrets\./g).length, 1);
  const gen = code.slice(
    code.indexOf('- name: Generate'),
    code.indexOf('- name: Verify checksums'),
  );
  assert.match(gen, /secrets\.MNEMONIC_IMAGE_API_KEY/);
  assert.match(gen, /--max-retries 0/);
  assert.match(gen, /--expect-manifest/);
  assert.match(code, /ref: \$\{\{ inputs\.reviewed_sha \}\}/);
  assert.match(code, /\[0-9a-f\]\{40\}/);
  assert.match(code, /checked-out HEAD != reviewed_sha/);
  assert.match(code, /persist-credentials: false/);
});

test('artifact includes hidden files and fails when empty; provenance chain enforced', () => {
  assert.match(code, /include-hidden-files: true/);
  assert.match(code, /if-no-files-found: error/);
  assert.match(code, /must be the LATEST run/);
  assert.match(code, /first_run=true refused/);
  assert.match(code, /previous_run_id required unless first_run=true/);
});

test('inputs never interpolated into shell run blocks', () => {
  const steps = code.split(/\n\s+- (?=name:|uses:|run:)/);
  let runSteps = 0;
  for (const st of steps) {
    const i = st.search(/^(\s*- )?\s*run: /m);
    if (i < 0) continue;
    runSteps++;
    assert.doesNotMatch(st.slice(i), /\$\{\{\s*(inputs|github\.event)\./);
  }
  assert.ok(runSteps >= 5);
});

// ---- Execute the real shell of the draft steps (no network: `gh` is a local stub) ----
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function stepRun(name) {
  const lines = wf.split('\n');
  const i = lines.findIndex((l) => l.includes(`- name: ${name}`));
  assert.ok(i >= 0, name);
  const r = lines.findIndex((l, k) => k > i && /^\s+run: \|/.test(l));
  const out = [];
  for (
    let k = r + 1;
    k < lines.length && (lines[k].startsWith('          ') || lines[k] === '');
    k++
  )
    out.push(lines[k].slice(10));
  return out.join('\n');
}
const BASE = {
  IN_SHA: 'a'.repeat(40),
  IN_ONLY: '山',
  IN_CAP: '1',
  IN_FIRST: 'true',
  PREV_RUN: '',
  RECOVER_RUN: '',
  RECOVERABLE_RUN: '46057258136',
  PYTHONUTF8: '1',
};
function runValidate(over) {
  return spawnSync('bash', ['-c', stepRun('Validate inputs')], {
    env: { PATH: process.env.PATH, ...BASE, ...over },
    encoding: 'utf8',
  });
}

test('validate inputs: real shell accepts Hanzi (no [:ascii:] regex any more)', () => {
  assert.doesNotMatch(code, /\[:ascii:\]/);
  for (const only of ['山', '水,木,火', '魚,鳥'])
    assert.equal(runValidate({ IN_ONLY: only, IN_FIRST: 'false', PREV_RUN: '5' }).status, 0, only);
  assert.equal(runValidate({}).status, 0);
});

test('validate inputs: rejects non-Hanzi, duplicates, too many, bad sha/cap/ids', () => {
  const bad = [
    { IN_ONLY: 'a' },
    { IN_ONLY: '山山' },
    { IN_ONLY: '山,山', IN_FIRST: 'false', PREV_RUN: '5' },
    { IN_ONLY: '山\n' },
    { IN_ONLY: '😀' },
    { IN_ONLY: '，' },
    { IN_ONLY: '山,水', IN_FIRST: 'true' },
    {
      IN_ONLY: '山,水,木,火,日,月,人,雨,魚,鳥,山'.replace(',山', ''),
      IN_FIRST: 'false',
      PREV_RUN: '5',
    }, // 10 ok -> see below
    { IN_SHA: 'A'.repeat(40) },
    { IN_SHA: 'a'.repeat(39) },
    { IN_CAP: '2' },
    { IN_CAP: '0' },
    { IN_CAP: '1.001' },
    { IN_FIRST: 'false', PREV_RUN: '' },
    { IN_FIRST: 'false', PREV_RUN: 'x1' },
    { IN_FIRST: 'true', PREV_RUN: '5' },
    { RECOVER_RUN: '123' },
    { RECOVER_RUN: '46057258136', IN_FIRST: 'false', PREV_RUN: '5' },
  ];
  const results = bad.map((o) => runValidate(o).status);
  // the 10-character list is valid (exactly 10) -> status 0; every other case must fail
  results.forEach((s, i) => {
    if (i === 7) assert.equal(s, 0, 'exactly 10 chars allowed');
    else assert.notEqual(s, 0, JSON.stringify(bad[i]));
  });
  assert.notEqual(
    runValidate({ IN_ONLY: '山,水,木,火,日,月,人,雨,魚,鳥,大', IN_FIRST: 'false', PREV_RUN: '5' })
      .status,
    0,
  );
  assert.equal(runValidate({ RECOVER_RUN: '46057258136' }).status, 0);
});

// gh stub: serves fixtures from $FIX (runs.json, run.json, jobs.json, artifacts.json)
function runProvenance(over, fx) {
  const dir = mkdtempSync(join(tmpdir(), 'prov-'));
  for (const [k, v] of Object.entries(fx)) writeFileSync(join(dir, k), JSON.stringify(v));
  writeFileSync(
    join(dir, 'gh'),
    `#!/bin/bash
echo "gh $*" >> "$FIX/calls.log"
case "$*" in
  *"--repo"*"run list"*|"run list --repo "*) cat "$FIX/fx-runs.json";;
  *"api --paginate"*jobs*) cat "$FIX/fx-jobs.json";;
  *"api repos/"*"/artifacts") cat "$FIX/artifacts.json";;
  *"api repos/"*"/actions/runs/"*) cat "$FIX/run.json";;
  *) echo "unexpected: $*" >&2; exit 9;;
esac
`,
  );
  chmodSync(join(dir, 'gh'), 0o755);
  const r = spawnSync('bash', ['-c', stepRun('Verify run provenance')], {
    cwd: dir,
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      FIX: dir,
      GH_REPO: 'o/r',
      THIS_RUN: '999',
      GITHUB_STEP_SUMMARY: join(dir, 'summary'),
      IN_FIRST: 'true',
      PREV_RUN: '',
      RECOVER_RUN: '',
      ...over,
    },
    encoding: 'utf8',
  });
  const calls = (() => {
    try {
      return readFileSync(join(dir, 'calls.log'), 'utf8');
    } catch {
      return '';
    }
  })();
  return { ...r, calls };
}
const ok = {
  run: {
    status: 'completed',
    conclusion: 'failure',
    path: '.github/workflows/mnemonic-art-pilot.yml',
    run_attempt: 1,
  },
  artifacts: { total_count: 0 },
};
const skippedJob = (c = 'skipped') => ({
  jobs: [
    {
      conclusion: 'failure',
      steps: [
        { name: 'Validate inputs', conclusion: 'failure' },
        { name: 'Generate (the ONLY step with the secret; retries 0)', conclusion: c },
      ],
    },
  ],
});
const files = (runs, jobs, extra = {}) => ({
  'fx-runs.json': runs,
  'run.json': ok.run,
  'fx-jobs.json': jobs,
  'artifacts.json': ok.artifacts,
  ...extra,
});

test('provenance: empty run list -> first_run ok, non-first refused', () => {
  assert.equal(runProvenance({}, files([], skippedJob())).status, 0);
  assert.notEqual(
    runProvenance({ IN_FIRST: 'false', PREV_RUN: '5' }, files([], skippedJob())).status,
    0,
  );
});

test('provenance: gh always called with explicit --repo', () => {
  const r = runProvenance({}, files([], skippedJob()));
  assert.match(r.calls, /run list --repo o\/r/);
});

test('provenance: failed run 46057258136 blocks first_run without recovery', () => {
  const runs = [{ databaseId: 46057258136, conclusion: 'failure' }];
  assert.notEqual(runProvenance({}, files(runs, skippedJob())).status, 0);
});

test('recovery: succeeds only when jobs API proves Generate skipped, no artifacts', () => {
  const runs = [{ databaseId: 46057258136, conclusion: 'failure' }];
  const env = { RECOVER_RUN: '46057258136' };
  assert.equal(runProvenance(env, files(runs, skippedJob())).status, 0);
  // Generate not skipped (success/failure/cancelled/missing) -> fail closed
  for (const c of ['success', 'failure', 'cancelled', null])
    assert.notEqual(runProvenance(env, files(runs, skippedJob(c))).status, 0, String(c));
  assert.notEqual(runProvenance(env, files(runs, { jobs: [{ steps: [] }] })).status, 0);
  assert.notEqual(runProvenance(env, files(runs, { jobs: [] })).status, 0);
  // any rerun attempt that reached Generate -> fail closed
  const two = { jobs: [...skippedJob().jobs, ...skippedJob('success').jobs] };
  assert.notEqual(runProvenance(env, files(runs, two)).status, 0);
  // artifact present / run not failed / other workflow
  assert.notEqual(
    runProvenance(env, files(runs, skippedJob(), { 'artifacts.json': { total_count: 1 } })).status,
    0,
  );
  assert.notEqual(
    runProvenance(
      env,
      files(runs, skippedJob(), { 'run.json': { ...ok.run, conclusion: 'success' } }),
    ).status,
    0,
  );
  assert.notEqual(
    runProvenance(
      env,
      files(runs, skippedJob(), { 'run.json': { ...ok.run, path: '.github/workflows/ci.yml' } }),
    ).status,
    0,
  );
});

test('recovery does not bypass other prior runs (no general ledger bypass)', () => {
  const runs = [
    { databaseId: 50000000000, conclusion: 'success' },
    { databaseId: 46057258136, conclusion: 'failure' },
  ];
  assert.notEqual(
    runProvenance({ RECOVER_RUN: '46057258136' }, files(runs, skippedJob())).status,
    0,
  );
});

test('non-first run still needs the latest run id', () => {
  const runs = [
    { databaseId: 7, conclusion: 'success' },
    { databaseId: 3, conclusion: 'success' },
  ];
  assert.equal(
    runProvenance({ IN_FIRST: 'false', PREV_RUN: '7' }, files(runs, skippedJob())).status,
    0,
  );
  assert.notEqual(
    runProvenance({ IN_FIRST: 'false', PREV_RUN: '3' }, files(runs, skippedJob())).status,
    0,
  );
});

test('verify/upload are conditional on setup + manifest existence; secret still only in Generate', () => {
  assert.match(code, /id: install/);
  assert.match(
    code,
    /steps\.install\.outcome == 'success' && steps\.detect\.outputs\.exists == 'true'/,
  );
  assert.match(code, /always\(\) && steps\.detect\.outputs\.exists == 'true'/);
  assert.equal(code.match(/secrets\./g).length, 1);
  assert.match(code, /--expect-manifest "\$expect"/);
});

test('revise input: only with first_run=false; passed as a flag array, never interpolated', () => {
  assert.match(code, /IN_REVISE: \$\{\{ inputs\.revise \}\}/);
  assert.equal(
    runValidate({ IN_ONLY: '人,雨', IN_FIRST: 'false', PREV_RUN: '5', IN_REVISE: 'true' }).status,
    0,
  );
  assert.notEqual(runValidate({ IN_REVISE: 'true' }).status, 0); // first_run=true + revise
  const gen = code.slice(code.indexOf('- name: Generate'), code.indexOf('- name: Detect'));
  assert.match(gen, /extra\+=\(--revise\)/);
  assert.match(gen, /"\$\{extra\[@\]\}"/);
});
