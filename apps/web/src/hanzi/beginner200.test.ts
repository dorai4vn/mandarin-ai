import { describe, expect, it } from 'vitest';
import {
  BEGINNER,
  BEGINNER_TARGET,
  beginnerSummary,
  pilotConsistency,
  validateBeginner,
  type BeginnerDataset,
} from './beginner200';

const clone = (): BeginnerDataset => JSON.parse(JSON.stringify(BEGINNER)) as BeginnerDataset;

describe('beginner-200 dataset (content checkpoint)', () => {
  it('has exactly 200 unique valid characters', () => {
    expect(BEGINNER.characters).toHaveLength(BEGINNER_TARGET);
    expect(new Set(BEGINNER.characters.map((c) => c.hanzi)).size).toBe(200);
    expect(validateBeginner()).toEqual([]);
  });
  it('keeps the 10 pilot characters consistent with the mnemonic manifest, with 鱼/鸟 aliases', () => {
    expect(pilotConsistency()).toEqual([]);
    expect(beginnerSummary().pilot).toBe(10);
    expect(BEGINNER.characters.find((c) => c.hanzi === '鱼')?.traditionalAlias).toBe('魚');
    expect(BEGINNER.characters.find((c) => c.hanzi === '鸟')?.traditionalAlias).toBe('鳥');
    expect(BEGINNER.characters.some((c) => c.hanzi === '魚' || c.hanzi === '鳥')).toBe(false);
  });
  it('reports every artwork as pending and makes no official-HSK claim', () => {
    const s = beginnerSummary();
    expect(s.artworkPending).toBe(200);
    expect(s.artworkApproved).toBe(0);
    expect(BEGINNER.meta.selectionNote).toMatch(/NOT the official HSK/);
    expect(JSON.stringify(BEGINNER.characters)).not.toMatch(/hskLevel/i);
  });
  it('rejects duplicates, wrong counts, missing examples and fake approval', () => {
    const d = clone();
    d.characters[1]!.hanzi = d.characters[0]!.hanzi;
    expect(validateBeginner(d).join()).toMatch(/duplicate hanzi/);
    const e = clone();
    e.characters.pop();
    expect(validateBeginner(e).join()).toMatch(/count 199/);
    const f = clone();
    f.characters[5]!.examples = [];
    expect(validateBeginner(f).join()).toMatch(/needs >=2 examples/);
    const g = clone();
    g.characters[7]!.artwork.status = 'artwork-approved';
    expect(validateBeginner(g).join()).toMatch(/must stay pending/);
    const h = clone();
    h.characters[9]!.artwork.file = h.characters[8]!.artwork.file;
    expect(validateBeginner(h).join()).toMatch(/duplicate art file/);
    const i = clone();
    i.characters[3]!.examples[0]!.zh = '没有';
    expect(validateBeginner(i).join()).toMatch(/lacks character/);
  });
});
