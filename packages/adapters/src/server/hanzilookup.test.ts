import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HanziLookupRecognizer } from './hanzilookup.js';

const dataPath = fileURLToPath(new URL('../../data/mmah.json', import.meta.url));
const hasData = existsSync(dataPath);

const line = (x1: number, y1: number, x2: number, y2: number, n = 10, t0 = 0) =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: x1 + ((x2 - x1) * i) / n,
    y: y1 + ((y2 - y1) * i) / n,
    t: t0 + i * 10,
  }));

/** SYNTHETIC strokes for 山 (not real handwriting — see docs/HANDWRITING_EVALUATION.md). */
const shan = [
  { points: line(128, 20, 128, 220) },
  { points: [...line(40, 90, 40, 220, 10, 200), ...line(40, 220, 216, 220, 10, 310).slice(1)] },
  { points: line(216, 90, 216, 220, 10, 500) },
];

describe('HanziLookupRecognizer (server-side, D-029)', () => {
  it('reports not ready without data', () => {
    expect(new HanziLookupRecognizer('/nonexistent/mmah.json').isReady()).toBe(false);
  });

  it.skipIf(!hasData)('returns 山 as top candidate for synthetic 山 strokes', async () => {
    const r = new HanziLookupRecognizer(dataPath);
    expect(r.isReady()).toBe(true);
    const res = await r.recognize({ strokes: shan, pointerType: 'unknown', limit: 8 });
    expect(res.source).toBe('live');
    expect(res.scoreOrder).toBe('higher_is_better');
    expect(res.candidates[0]?.text).toBe('山');
    expect(res.candidates.length).toBeLessThanOrEqual(8);
  });
});
