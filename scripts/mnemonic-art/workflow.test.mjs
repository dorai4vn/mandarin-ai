// Offline structural checks on the DRAFT workflow (text-based; no YAML dependency, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wf = readFileSync(
  new URL('../../docs/workflow-drafts/mnemonic-art-pilot.yml', import.meta.url),
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
