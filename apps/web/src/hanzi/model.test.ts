import { describe, expect, it } from 'vitest';
import { HANZI_HISTORY } from './data';
import { HISTORY_GLYPHS, hasHanziHistory, historyGlyphsOf } from './glyphs';
import { nextIndex, playableStages, validateHistory } from './model';

describe('hanzi history dataset (M3.5)', () => {
  it('index matches data', () => {
    expect([...HISTORY_GLYPHS].sort()).toEqual(Object.keys(HANZI_HISTORY).sort());
  });
  it('every entry has sourced stages and valid evidence', () => {
    for (const h of Object.values(HANZI_HISTORY)) expect(validateHistory(h)).toEqual([]);
  });
  it('山 keeps oracle→bronze→seal attested, clerical explicitly missing, mnemonic not evidence', () => {
    const h = HANZI_HISTORY['山']!;
    expect(h.stages.map((s) => `${s.id}:${s.status}`)).toEqual([
      'oracle:attested',
      'bronze:attested',
      'seal:attested',
      'clerical:missing',
      'regular:modern',
    ]);
    expect(h.mnemonic?.isHistoricalEvidence).toBe(false);
    expect(h.strokeOrder.available).toBe(false);
  });
  it('missing stages are never played', () => {
    const p = playableStages(HANZI_HISTORY['山']!);
    expect(p.map((s) => s.id)).toEqual(['oracle', 'bronze', 'seal', 'regular']);
  });
  it('rejects an attested stage without licence/source', () => {
    const bad = structuredClone(HANZI_HISTORY['山']!);
    const s = bad.stages[0]!;
    if (s.status === 'attested') s.evidence.licence = '';
    expect(validateHistory(bad)).toContain('oracle: licence');
  });
  it('helpers', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBeNull();
    expect(hasHanziHistory('山')).toBe(true);
    expect(historyGlyphsOf('火山山')).toEqual(['山']);
    expect(historyGlyphsOf('水')).toEqual([]);
  });
});
