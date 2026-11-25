import { describe, expect, it } from 'vitest';
import { hasHanzi, matchScore, numberedToMarked, pinyinKey, vietnameseKey } from './search.js';

describe('dictionary search keys (PRD-02)', () => {
  it('pinyin with marks, numbers or none gives the same key', () => {
    for (const p of ['shān', 'shan1', 'shan', 'SHAN', 'Shān']) expect(pinyinKey(p)).toBe('shan');
    expect(pinyinKey('nǐ hǎo')).toBe(pinyinKey('ni3 hao3'));
    expect(pinyinKey('lǜ')).toBe('lv');
    expect(pinyinKey('lu:4')).toBe('lv');
    expect(pinyinKey("xī'ān")).toBe('xian');
  });

  it('Vietnamese is accent-insensitive', () => {
    expect(vietnameseKey('Núi')).toBe('nui');
    expect(vietnameseKey('đường  phố')).toBe('duong pho');
  });

  it('numbered pinyin becomes marked pinyin', () => {
    expect(numberedToMarked('ni3 hao3')).toBe('nǐ hǎo');
    expect(numberedToMarked('shan1')).toBe('shān');
    expect(numberedToMarked('xie4 xie5')).toBe('xiè xie');
    expect(numberedToMarked('lv4')).toBe('lǜ');
    expect(numberedToMarked('dou1')).toBe('dōu');
    expect(numberedToMarked('gui4')).toBe('guì');
    expect(numberedToMarked('liu2')).toBe('liú');
    expect(numberedToMarked('nǐ hǎo')).toBe('nǐ hǎo');
  });

  it('finds 山 via 山, shan1, shān and núi; ranks hanzi above pinyin above meaning', () => {
    const shan = { simplified: '山', pinyin: 'shān', meaningVi: 'núi' };
    for (const q of ['山', 'shan1', 'shān', 'shan', 'núi', 'nui'])
      expect(matchScore(shan, q)).toBeGreaterThan(0);
    expect(matchScore(shan, '山')).toBeGreaterThan(matchScore(shan, 'shan'));
    expect(matchScore(shan, 'shan')).toBeGreaterThan(matchScore(shan, 'nui'));
    expect(matchScore(shan, '水')).toBe(0);
    expect(
      matchScore(
        { simplified: '中国', traditional: '中國', pinyin: 'Zhōngguó', meaningVi: 'Trung Quốc' },
        '國',
      ),
    ).toBe(80);
    expect(
      matchScore({ simplified: '你好', pinyin: 'nǐ hǎo', meaningVi: 'xin chào' }, 'chao'),
    ).toBe(55);
    expect(hasHanzi('abc')).toBe(false);
  });
});
