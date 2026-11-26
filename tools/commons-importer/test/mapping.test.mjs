// SYNTHETIC fixtures: titles/files are fabricated for tests, not historical data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidateTitles,
  coverageReport,
  parseCandidateTitle,
  PILOT_CHARACTERS,
} from '../src/mapping.mjs';
import { runImport } from '../src/importer.mjs';
import { page, fakeClient } from './helpers.mjs';

test('parses documented suffixes as pending-review, never evidence', () => {
  const c = parseCandidateTitle('File:山-bronze-warring.svg');
  assert.equal(c.character, '山');
  assert.equal(c.script, 'bronze');
  assert.equal(c.period, 'warring-states');
  assert.equal(c.status, 'pending-review');
  assert.equal(c.isEvidence, false);
  assert.equal(c.representation, 'unknown');
  for (const s of ['oracle', 'bronze', 'bronze-shang', 'bronze-spring', 'silk', 'slip', 'seal'])
    assert.equal(parseCandidateTitle(`File:水-${s}.svg`).recognised, true, s);
});
test('unknown suffix / non-han / wrong shape are not mapped', () => {
  assert.equal(parseCandidateTitle('File:山-weird.svg').recognised, false);
  assert.equal(parseCandidateTitle('File:A-oracle.svg'), null);
  assert.equal(parseCandidateTitle('File:山-oracle.png'), null);
  assert.equal(parseCandidateTitle('File:山山-oracle.svg'), null);
});
test('candidateTitles is deterministic and covers 10 pilot chars x suffixes', () => {
  assert.equal(PILOT_CHARACTERS.length, 10);
  const a = candidateTitles();
  assert.deepEqual(a, candidateTitles());
  assert.equal(a.length, 80);
  assert.ok(a.includes('File:魚-seal.svg'));
});
test('coverage keeps candidates / eligible / curated separate', () => {
  const existing = [
    'File:山-oracle.svg',
    'File:山-seal.svg',
    'File:水-oracle.svg',
    'File:山-weird.svg',
    'File:X-oracle.svg',
  ];
  const eligible = [{ title: 'File:山-oracle.svg' }, { title: 'File:水-oracle.svg' }];
  const rejected = [{ title: 'File:山-seal.svg', reason: 'licence-unknown' }];
  const r = coverageReport({ existing, eligible, rejected });
  assert.equal(r.candidateFiles, 3);
  assert.equal(r.eligibleFiles, 2);
  assert.equal(r.curatedFiles, 0);
  assert.equal(r.curatedCharacters, 0);
  assert.equal(r.charactersWithCandidates, 2);
  assert.deepEqual(r.perCharacter['山'].rejected, [{ suffix: 'seal', reason: 'licence-unknown' }]);
  assert.equal(r.perCharacter['火'].candidates.length, 0);
  const c = coverageReport({
    existing,
    eligible,
    curations: [
      { title: 'File:山-oracle.svg', reviewer: 'owner' },
      { title: 'File:山-seal.svg', reviewer: 'owner' },
      { title: 'File:水-oracle.svg' },
    ],
  });
  assert.equal(c.curatedFiles, 1); // seal not eligible; 水 has no reviewer
  assert.equal(c.curatedCharacters, 1);
});
test('titles mode: missing pages counted, mapping stays null in manifest', async () => {
  const client = fakeClient([]);
  client.listTitles = async () => ({
    files: [page('File:山-oracle.svg'), { title: 'File:水-seal.svg', missing: true }],
  });
  const { manifest, report } = await runImport({ client, titles: ['x'], dryRun: true });
  assert.equal(report.eligible, 1);
  assert.equal(report.missing, 1);
  assert.deepEqual(manifest.missingTitles, ['File:水-seal.svg']);
  assert.equal(manifest.entries[0].character, null);
  assert.equal(manifest.entries[0].stage, null);
});
