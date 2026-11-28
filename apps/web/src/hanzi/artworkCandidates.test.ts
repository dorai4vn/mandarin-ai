import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEGINNER, activeChars } from './beginner200';

const root = new URL('../../../../', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('docs/artifacts/mnemonic-art-manifest-run-46158400581.json', root), 'utf8'),
) as { entries: Record<string, { status: string; sha256: string; bytes: number }> };

describe('verified artwork candidates (run 46158400581)', () => {
  it('maps every one of the 246 active characters (and the 4 archive pilots) to a checksum-valid candidate', () => {
    const wanted = [...activeChars(BEGINNER), ...BEGINNER.characters.filter((c) => c.pilot)];
    const files = new Set(wanted.map((c) => c.artwork.file));
    expect(files.size).toBe(250);
    for (const f of files) {
      const entry = manifest.entries[f];
      expect(entry?.status, f).toBe('stored');
      const buf = readFileSync(new URL(`apps/web/public/mnemonic-candidates/${f}`, root));
      expect(buf.length, f).toBe(entry!.bytes);
      expect(createHash('sha256').update(buf).digest('hex'), f).toBe(entry!.sha256);
    }
    expect(Object.keys(manifest.entries).length).toBe(250);
  });
  it('preserves the two superseded revisions and keeps all artwork unapproved', () => {
    for (const f of ['63b2debc050c-ren-person.webp', '0798c2eb01c3-yu-rain.webp'])
      expect(existsSync(new URL(`apps/web/public/mnemonic-candidates/superseded/${f}`, root))).toBe(
        true,
      );
    expect(BEGINNER.characters.every((c) => c.artwork.status === 'pending-artwork')).toBe(true);
  });
});
