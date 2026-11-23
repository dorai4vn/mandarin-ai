#!/usr/bin/env node
// Downloads the HanziLookup `mmah.json` stroke data (derived from Make Me a Hanzi, Arphic
// Public License) plus its licence into packages/adapters/data/ (git-ignored). The file is
// pinned by SHA-256 so a changed upstream file is never used silently. See D-029.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/gugray/HanziLookupJS/master';
const FILES = [
  {
    name: 'mmah.json',
    path: 'dist/mmah.json',
    sha256: '287943446fe52cef43df1ba47619a3c040e5924b6031b90939e880711dbc70ae',
  },
  { name: 'LICENSE-APL', path: 'LICENSE-APL', sha256: null },
];
const dir = new URL('../data/', import.meta.url);
mkdirSync(dir, { recursive: true });

for (const f of FILES) {
  const target = new URL(f.name, dir);
  if (existsSync(target) && f.sha256) {
    const have = createHash('sha256').update(readFileSync(target)).digest('hex');
    if (have === f.sha256) {
      console.info(`${f.name}: already present (sha256 OK)`);
      continue;
    }
  }
  const res = await fetch(`${BASE}/${f.path}`);
  if (!res.ok) throw new Error(`Download failed for ${f.name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  if (f.sha256 && sha !== f.sha256) throw new Error(`${f.name}: sha256 mismatch (${sha})`);
  writeFileSync(target, buf);
  console.info(`${f.name}: downloaded ${buf.length} bytes (sha256 ${sha})`);
}
