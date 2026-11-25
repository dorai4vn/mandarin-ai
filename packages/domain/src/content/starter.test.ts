import { ContentSnapshotSchema } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { pinyinKey } from '../dictionary/search.js';
import { STARTER_COURSE, STARTER_LEXEMES } from './starter.js';

describe('starter content (D-012)', () => {
  it('is a valid snapshot with unique ids and unique (word, pinyin, meaning)', () => {
    expect(() =>
      ContentSnapshotSchema.parse({
        source: 'mock',
        version: 'v',
        lexemes: STARTER_LEXEMES,
        courses: [STARTER_COURSE],
      }),
    ).not.toThrow();
    const ids = STARTER_LEXEMES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = STARTER_LEXEMES.map(
      (l) => `${l.simplified}|${pinyinKey(l.pinyin)}|${l.meaningVi}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every lesson word exists in the shared lexicon (a word shared by lessons is one lexeme)', () => {
    const ids = new Set(STARTER_LEXEMES.map((l) => l.id));
    const used = STARTER_COURSE.chapters.flatMap((c) => c.lessons.flatMap((l) => l.lexemeIds));
    for (const id of used) expect(ids.has(id), id).toBe(true);
    // 天 appears in two lessons but is one lexeme.
    expect(used.filter((id) => id === 'lx-tian')).toHaveLength(2);
    expect(STARTER_LEXEMES.filter((l) => l.simplified === '天')).toHaveLength(1);
  });

  it('pinyin uses tone marks (no tone numbers)', () => {
    for (const l of STARTER_LEXEMES) expect(l.pinyin, l.id).not.toMatch(/[1-5]/);
  });
});
