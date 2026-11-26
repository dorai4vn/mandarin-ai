// Atomic persistence of manifest + sanitized SVGs. SVGs are written first, manifest last, so a
// crash can never leave a manifest that references a missing file.
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { serialize } from './importer.mjs';

async function atomicWrite(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export async function persistManifest(outDir, manifest) {
  await mkdir(path.join(outDir, 'svg'), { recursive: true });
  for (const e of manifest.entries) {
    if (!e.svg) continue;
    const f = `${e.sanitizedSha256.slice(0, 16)}.svg`;
    await atomicWrite(path.join(outDir, 'svg', f), e.svg);
    e.file = `svg/${f}`;
  }
  const slim = { ...manifest, entries: manifest.entries.map(({ svg, ...rest }) => rest) };
  await atomicWrite(path.join(outDir, 'manifest.json'), serialize(slim));
}
