import { describe, expect, it } from 'vitest';
import {
  MNEMONICS,
  candidateSrc,
  findMnemonic,
  isSafeMnemonicSrc,
  mnemonicSummary,
  validateMnemonics,
} from './mnemonic';

describe('visual mnemonic manifest (D3)', () => {
  it('has the 10 pilot characters, valid, none claiming artwork', () => {
    expect(MNEMONICS.map((m) => m.glyph).join('')).toBe('山水木火日月人雨魚鳥');
    expect(validateMnemonics()).toEqual([]);
    for (const m of MNEMONICS) {
      expect(m.image).toBeNull();
      expect(m.status).toBe('pending-artwork');
      expect(m.isHistoricalEvidence).toBe(false);
      expect(m.brief.length).toBeGreaterThan(80);
    }
  });
  it('resolves simplified aliases', () => {
    expect(findMnemonic('鱼')?.glyph).toBe('魚');
    expect(findMnemonic('鸟')?.glyph).toBe('鳥');
    expect(findMnemonic('龍')).toBeUndefined();
  });
  it('rejects an image without provenance/approval and duplicates', () => {
    const base = MNEMONICS[0]!;
    const img = {
      src: '/x.webp',
      alt: 'a',
      width: 1600,
      height: 1200,
      provenance: '',
      licence: '',
      licenceUrl: 'http://x',
      author: '',
    } as const;
    expect(validateMnemonics([{ ...base, image: img }]).length).toBeGreaterThan(0);
    expect(validateMnemonics([base, base]).some((e) => e.startsWith('duplicate'))).toBe(true);
  });
  it('restricts image src to local mnemonic assets', () => {
    expect(isSafeMnemonicSrc('/mnemonic/shan-mountain.webp')).toBe(true);
    for (const bad of [
      '//evil.com/x.webp',
      'https://x/mnemonic/a.webp',
      '/mnemonic/../a.webp',
      '/other/a.webp',
      '/mnemonic/a.png',
    ])
      expect(isSafeMnemonicSrc(bad)).toBe(false);
    const base = MNEMONICS[0]!;
    const img = {
      src: '//evil.com/x.webp',
      alt: 'a',
      width: 1600,
      height: 1200,
      provenance: 'p',
      licence: 'CC0',
      licenceUrl: 'https://x',
      author: 'a',
    } as const;
    expect(validateMnemonics([{ ...base, image: img, status: 'artwork-approved' }])).toContain(
      '山: image provenance',
    );
  });
  it('summarises pending artwork and keeps candidates apart from approved assets', () => {
    expect(mnemonicSummary()).toEqual({ total: 10, approved: 0, pending: 10 });
    expect(candidateSrc(MNEMONICS[0]!)).toBe('/mnemonic-candidates/shan-mountain.webp');
  });
});

describe('artwork integration manifest doc', () => {
  it('lists every manifest asset with candidate and approved paths, and claims none approved', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync(
      new URL('../../../../docs/VISUAL_MNEMONIC_INTEGRATION.md', import.meta.url),
      'utf8',
    );
    for (const m of MNEMONICS) {
      expect(doc).toContain(`| ${m.glyph} | \`${m.assetFile}\``);
      expect(doc).toContain(`apps/web/public${candidateSrc(m)}`);
      expect(doc).toContain(`apps/web/public/mnemonic/${m.assetFile}`);
    }
    expect(doc).toContain('ALL 10 PENDING');
    expect(new Set(MNEMONICS.map((m) => m.assetFile)).size).toBe(MNEMONICS.length);
  });
});
