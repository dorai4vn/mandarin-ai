import { describe, expect, it } from 'vitest';
import { SYLLABUS_L1 } from './syllabusL1';
import {
  BEGINNER,
  BEGINNER_TARGET,
  beginnerSummary,
  pilotConsistency,
  validateBeginner,
  type BeginnerDataset,
} from './beginner200';

const clone = (): BeginnerDataset => JSON.parse(JSON.stringify(BEGINNER)) as BeginnerDataset;

describe('Hanzi dataset: 246 active Level 1 + 40 archive', () => {
  it('has 286 unique valid records: 246 active in exact source order, 40 archive', () => {
    expect(BEGINNER_TARGET).toBe(286);
    expect(BEGINNER.characters).toHaveLength(286);
    expect(new Set(BEGINNER.characters.map((c) => c.hanzi)).size).toBe(286);
    expect(validateBeginner()).toEqual([]);
    expect(SYLLABUS_L1).toHaveLength(246);
    expect(new Set(SYLLABUS_L1).size).toBe(246);
    const active = BEGINNER.characters.filter((c) => c.set === 'syllabus-l1');
    expect(
      [...active]
        .sort((a, b) => a.sourceOrder! - b.sourceOrder!)
        .map((c) => c.hanzi)
        .join(''),
    ).toBe(SYLLABUS_L1);
    expect(SYLLABUS_L1.slice(0, 5)).toBe('爱八爸吧白');
    expect(SYLLABUS_L1.slice(-5)).toBe('租昨作坐做');
  });
  it('keeps ids stable (1..200 unchanged, 86 new ids 201..286) and the 40 archive records outside the list', () => {
    expect(BEGINNER.characters.map((c) => c.id)).toEqual(
      Array.from({ length: 286 }, (_, i) => i + 1),
    );
    expect(BEGINNER.characters.filter((c) => c.id > 200)).toHaveLength(86);
    const archive = BEGINNER.characters.filter((c) => c.set === 'extension');
    expect(archive.map((c) => c.hanzi).join('')).toBe(
      '万山木风云地土石花草树河海头心耳眼脚身鱼鸟马羊走用长快红黑左右肉门店路站笔纸南北',
    );
    for (const c of archive) {
      expect(SYLLABUS_L1.includes(c.hanzi)).toBe(false);
      expect(c.sourceOrder).toBeUndefined();
    }
    expect(beginnerSummary()).toMatchObject({ total: 286, active: 246, archive: 40 });
  });
  it('keeps the 10 pilot characters consistent with the mnemonic manifest, with 鱼/鸟 aliases', () => {
    expect(pilotConsistency()).toEqual([]);
    expect(beginnerSummary().pilot).toBe(10);
    expect(BEGINNER.characters.find((c) => c.hanzi === '鱼')?.traditionalAlias).toBe('魚');
    expect(BEGINNER.characters.find((c) => c.hanzi === '鸟')?.traditionalAlias).toBe('鳥');
    expect(BEGINNER.characters.some((c) => c.hanzi === '魚' || c.hanzi === '鳥')).toBe(false);
  });
  it('reports every artwork as pending; source provenance is the supplied transcription, not a verified PDF', () => {
    const s = beginnerSummary();
    expect(s.artworkPending).toBe(286);
    expect(s.artworkApproved).toBe(0);
    const src = BEGINNER.meta.hsk3L1Source as Record<string, unknown>;
    expect(src.printedPages).toBe('353-354');
    expect(src.entries).toBe(246);
    expect(String(src.provenance)).toMatch(/did NOT download or independently verify/);
    expect(BEGINNER.meta.selectionNote).toMatch(/no HSK level/);
    expect(JSON.stringify(BEGINNER.characters)).not.toMatch(/hskLevel/i);
  });
  it('rejects duplicates, wrong counts, missing examples and fake approval', () => {
    const d = clone();
    d.characters[1]!.hanzi = d.characters[0]!.hanzi;
    expect(validateBeginner(d).join()).toMatch(/duplicate hanzi/);
    const e = clone();
    e.characters.pop();
    expect(validateBeginner(e).join()).toMatch(/count 285/);
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
    const j = clone();
    j.characters[0]!.set = 'extension';
    expect(validateBeginner(j).join()).toMatch(/set disagrees|active 245/);
    const k = clone();
    const a = k.characters.find((c) => c.sourceOrder === 1)!;
    const b = k.characters.find((c) => c.sourceOrder === 2)!;
    [a.sourceOrder, b.sourceOrder] = [2, 1];
    expect(validateBeginner(k).join()).toMatch(/differs from the Level 1 source list/);
  });
});
