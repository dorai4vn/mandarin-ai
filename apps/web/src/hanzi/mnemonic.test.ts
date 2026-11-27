import { describe, expect, it } from 'vitest';
import { MNEMONICS, findMnemonic, validateMnemonics } from './mnemonic';

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
    const img = { src: '/x.webp', alt: 'a', width: 1600, height: 1200, provenance: '', licence: '', licenceUrl: 'http://x', author: '' } as const;
    expect(validateMnemonics([{ ...base, image: img }]).length).toBeGreaterThan(0);
    expect(validateMnemonics([base, base]).some((e) => e.startsWith('duplicate'))).toBe(true);
  });
});
