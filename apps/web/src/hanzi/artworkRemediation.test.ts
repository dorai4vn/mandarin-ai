import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BEGINNER, activeChars } from './beginner200';
import {
  BUDGET_USD,
  EST_COST_PER_IMAGE_USD,
  LEDGER_CUMULATIVE_USD,
  REMEDIATION,
} from './artworkRemediation';

const audit = readFileSync(
  new URL('../../../../docs/M3_5_SEMANTIC_AUDIT.md', import.meta.url),
  'utf8',
);
const nonPass = [...audit.matchAll(/^\| \d+ \| (\S+) \|.*\| (UNCERTAIN|FAIL) \|/gm)].map(
  (m) => m[1],
);

describe('M3.5 remediation matrix (53 FAIL/UNCERTAIN)', () => {
  it('covers exactly the 53 non-PASS audit rows, all active, no duplicates', () => {
    expect(nonPass).toHaveLength(53);
    expect(REMEDIATION.map((r) => r.hanzi).sort()).toEqual([...nonPass].sort());
    const active = new Set(activeChars(BEGINNER).map((c) => c.hanzi));
    expect(REMEDIATION.every((r) => active.has(r.hanzi))).toBe(true);
    expect(REMEDIATION.filter((r) => r.prelimVerdict === 'FAIL')).toHaveLength(9);
    expect(REMEDIATION.filter((r) => r.prelimVerdict === 'UNCERTAIN')).toHaveLength(44);
  });
  it('every row has the content its action requires', () => {
    for (const r of REMEDIATION) {
      expect(r.reasonVi.length, r.hanzi).toBeGreaterThan(10);
      if (r.action === 'contextual-card') {
        expect(r.card, r.hanzi).toBeDefined();
        expect(r.card!.zh, r.hanzi).toContain(r.hanzi);
        expect(r.card!.pinyin.length).toBeGreaterThan(2);
        expect(r.card!.vi.length).toBeGreaterThan(3);
        expect(r.card!.noteVi.length).toBeGreaterThan(10);
      } else if (r.action === 'replace-brief') {
        expect(r.replacement!.acceptance.length, r.hanzi).toBeGreaterThanOrEqual(3);
        expect(r.replacement!.prompt).toMatch(/No text/);
      } else expect(r.captionVi!.length).toBeGreaterThan(20);
    }
  });
  it('replacement cost estimate stays inside the $6 cumulative guard and is only a proposal', () => {
    const n = REMEDIATION.filter((r) => r.action === 'replace-brief').length;
    expect(n).toBe(11);
    const est = n * EST_COST_PER_IMAGE_USD;
    expect(LEDGER_CUMULATIVE_USD + est).toBeLessThan(BUDGET_USD);
    expect(BEGINNER.characters.every((c) => c.artwork.status === 'pending-artwork')).toBe(true);
  });
});
