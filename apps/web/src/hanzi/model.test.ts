import { describe, expect, it } from 'vitest';
import { HANZI_HISTORY } from './data';
import { HISTORY_GLYPHS, hasHanziHistory, historyGlyphsOf } from './glyphs';
import {
  clampIndex,
  missingStages,
  parallelGroups,
  nextIndex,
  playStartIndex,
  playableStages,
  stageProgress,
  uncertaintyText,
  validateHistory,
} from './model';

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
  it('index bounds and empty stage guards', () => {
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(NaN, 3)).toBe(0);
    expect(clampIndex(2, 0)).toBe(0);
    expect(playableStages({ ...HANZI_HISTORY['山']!, stages: [] })).toEqual([]);
    expect(nextIndex(0, 0)).toBeNull();
  });
  it('progress and play-at-end restart', () => {
    expect(stageProgress(0, 4)).toBe(0);
    expect(stageProgress(3, 4)).toBe(1);
    expect(stageProgress(9, 4)).toBe(1);
    expect(stageProgress(0, 1)).toBe(1);
    expect(playStartIndex(3, 4)).toBe(0);
    expect(playStartIndex(1, 4)).toBe(1);
  });
  it('uncertainty text exists for attested and modern stages', () => {
    for (const s of HANZI_HISTORY['山']!.stages.filter((x) => x.status !== 'missing'))
      expect(uncertaintyText(s).length).toBeGreaterThan(10);
    expect(uncertaintyText(HANZI_HISTORY['山']!.stages[0]!)).toContain('chưa đối chiếu');
  });
});

describe('V3 timeline model', () => {
  const base = { period: 'p', label: 'L' };
  const att = (id: string, extra: object) =>
    ({
      ...base,
      id,
      status: 'attested',
      svg: { viewBox: '0 0 1 1', d: 'M0 0' },
      evidence: {} as never,
      ...extra,
    }) as never;
  const h = (stages: unknown[]) => ({ stages }) as never;
  it('playable stages exclude missing tiles and sort by supported dating, modern last', () => {
    const ids = playableStages(
      h([
        { ...base, id: 'modern', status: 'modern', note: '' },
        att('seal', { sortYear: -300 }),
        { ...base, id: 'gap', status: 'missing', missingReason: 'x' },
        att('oracle', { sortYear: -1300 }),
      ]),
    ).map((s) => s.id);
    expect(ids).toEqual(['oracle', 'seal', 'modern']);
  });
  it('keeps data order when dating is unknown (no invented dates)', () => {
    const ids = playableStages(h([att('b', {}), att('a', {})])).map((s) => s.id);
    expect(ids).toEqual(['b', 'a']);
  });
  it('parallel tracks are grouped, not part of linear playback', () => {
    const x = h([att('main', { sortYear: -1 }), att('v1', { track: 'Giản thể' })]);
    expect(playableStages(x).map((s) => s.id)).toEqual(['main']);
    expect(parallelGroups(x).map((g) => [g.track, g.stages.length])).toEqual([['Giản thể', 1]]);
    expect(missingStages(x)).toEqual([]);
  });
  it('山 timeline shows 4 sourced/modern forms with short dates and the gap only in missing list', () => {
    const k = HANZI_HISTORY['山']!;
    expect(playableStages(k)).toHaveLength(4);
    expect(missingStages(k).map((s) => s.id)).toEqual(['clerical']);
    for (const s of playableStages(k)) expect(s.periodShort).toBeTruthy();
  });
});
