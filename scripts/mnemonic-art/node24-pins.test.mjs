// Both DRAFT launchers must use only the verified Node24-runtime action SHAs (no node20 pins).
// SHAs were verified against upstream action.yml (`runs.using: node24`) — see docs/MNEMONIC_ART_CLI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const NODE24 = new Set([
  'actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', // v5
  'actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444', // v5
  'pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320', // v5 (peeled commit)
  'actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f', // v6 (v5 is node20)
]);

for (const f of ['mnemonic-art-pilot.yml', 'mnemonic-art-production.yml']) {
  test(`${f}: every action pinned to a verified Node24 SHA; app Node stays 22`, () => {
    const dir = f.includes('pilot') ? '.github/workflows' : 'docs/workflow-drafts'; // pilot is active on main
    const src = readFileSync(new URL(`../../${dir}/${f}`, import.meta.url), 'utf8');
    const uses = [...src.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map((m) => m[1]);
    assert.ok(uses.length >= 4);
    for (const u of uses) assert.ok(NODE24.has(u), `unverified/non-node24 pin: ${u}`);
    assert.match(src, /node-version: 22/);
    assert.match(src, /include-hidden-files: true/);
  });
}
