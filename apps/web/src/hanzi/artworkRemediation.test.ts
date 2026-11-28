import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BEGINNER, activeChars } from './beginner200';
import { diagramLayout } from './countingLayout';
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

const byAction = (a: string) => REMEDIATION.filter((r) => r.action === a);
const H = (h: string) => REMEDIATION.find((r) => r.hanzi === h)!;

describe('M3.5 zero-cost remediation specifics', () => {
  it('action counts: 42 contextual (41 + 机), 7 diagrams, 3 contrast, 1 caption, 0 replace', () => {
    expect(byAction('contextual-card')).toHaveLength(42);
    expect(byAction('counting-diagram')).toHaveLength(7);
    expect(byAction('contrast-card')).toHaveLength(3);
    expect(byAction('retain-with-caption')).toHaveLength(1);
    expect(byAction('replace-brief')).toHaveLength(0);
  });
  it('counting diagrams show exactly the numeral value (deterministic, unique dots)', () => {
    const want: Record<string, number> = { 五: 5, 六: 6, 九: 9, 十: 10, 百: 100, 千: 1000, 零: 0 };
    for (const [h, n] of Object.entries(want)) {
      const spec = H(h).diagram!;
      expect(spec.count, h).toBe(n);
      const L = diagramLayout(spec);
      expect(L.dots, h).toHaveLength(n);
      expect(new Set(L.dots.map((d) => `${d.x},${d.y}`)).size, h).toBe(n);
      expect(L.empty).toBe(n === 0);
      if (spec.groups)
        expect(
          spec.groups.reduce((a, b) => a + b, 0),
          h,
        ).toBe(n);
      expect(L.dots.every((d) => d.x >= 0 && d.y >= 0 && d.x <= L.width && d.y <= L.height)).toBe(
        true,
      );
    }
    expect(diagramLayout(H('六').diagram!).dots.map((d) => d.y)).toEqual([24, 24, 24, 60, 60, 60]);
  });
  it('今/昨 and 租/买 contrast partners reference each other', () => {
    expect(H('今').card!.contrast!.zh).toContain('昨');
    expect(H('昨').card!.contrast!.zh).toContain('今');
    expect(H('租').card!.contrast!.zh).toContain('买');
  });
  it('reviewed readings: 非 only "rất" via 非常, 只 shows zhǐ and zhī, 机 via compounds', () => {
    expect(H('非').card!.noteVi).toContain('非常');
    expect(H('只').card!.pinyin).toContain('zhǐ');
    expect(H('只').card!.more!.some((m) => m.pinyin.includes('zhī'))).toBe(true);
    expect(H('机').card!.noteVi).toMatch(/手机.*飞机/);
  });
});

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
      if (r.card) {
        expect(r.card.pinyin, r.hanzi).toMatch(/[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü ,.?!，。？！]+/i);
        expect(r.card.pinyin, r.hanzi).not.toMatch(/\d/);
      }
      if (r.action === 'contextual-card') {
        expect(r.card, r.hanzi).toBeDefined();
        expect(r.card!.zh, r.hanzi).toContain(r.hanzi);
        expect(r.card!.pinyin.length).toBeGreaterThan(2);
        expect(r.card!.vi.length).toBeGreaterThan(3);
        expect(r.card!.noteVi.length).toBeGreaterThan(10);
      } else if (r.action === 'counting-diagram') {
        expect(r.diagram, r.hanzi).toBeDefined();
        expect(r.card!.zh, r.hanzi).toContain(r.hanzi);
      } else if (r.action === 'contrast-card') {
        expect(r.card!.contrast, r.hanzi).toBeDefined();
        expect(r.card!.contrast!.label.length).toBeGreaterThan(5);
      } else if (r.action === 'replace-brief') {
        expect(r.replacement!.acceptance.length, r.hanzi).toBeGreaterThanOrEqual(3);
        expect(r.replacement!.prompt).toMatch(/No text/);
      } else expect(r.captionVi!.length).toBeGreaterThan(20);
    }
  });
  it('replacement cost estimate stays inside the $6 cumulative guard and is only a proposal', () => {
    const n = REMEDIATION.filter((r) => r.action === 'replace-brief').length;
    expect(n).toBe(0); // all 11 former briefs resolved at zero cost (no image API)
    const est = n * EST_COST_PER_IMAGE_USD;
    expect(LEDGER_CUMULATIVE_USD + est).toBeLessThan(BUDGET_USD);
    expect(BEGINNER.characters.every((c) => c.artwork.status === 'pending-artwork')).toBe(true);
  });
});
