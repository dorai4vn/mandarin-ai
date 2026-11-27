import type { HanziHistory, HistoryStage } from './types';

/**
 * Stages that animation steps through: sourced main-line forms ordered by supported dating, then the
 * modern endpoint. Missing stages and parallel-track variants are never played (no fake linear
 * evolution). Stages without `sortYear` keep their data order relative to each other.
 */
export function playableStages(h: HanziHistory): HistoryStage[] {
  const main = h.stages.filter((s) => s.status !== 'missing' && !s.track);
  const modern = main.filter((s) => s.status === 'modern');
  const dated = main
    .filter((s) => s.status !== 'modern')
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.sortYear ?? Infinity) - (b.s.sortYear ?? Infinity) || a.i - b.i)
    .map((x) => x.s);
  return [...dated, ...modern];
}

/** Sourced forms from parallel traditions/variants, grouped by track (shown separately, not played). */
export function parallelGroups(h: HanziHistory): { track: string; stages: HistoryStage[] }[] {
  const groups = new Map<string, HistoryStage[]>();
  for (const s of h.stages) {
    if (s.status === 'missing' || !s.track) continue;
    groups.set(s.track, [...(groups.get(s.track) ?? []), s]);
  }
  return [...groups].map(([track, stages]) => ({ track, stages }));
}

/** Stages with no usable evidence; listed concisely in Explore only (never as timeline tiles). */
export function missingStages(h: HanziHistory): HistoryStage[] {
  return h.stages.filter((s) => s.status === 'missing');
}

export function nextIndex(current: number, length: number): number | null {
  return current + 1 < length ? current + 1 : null;
}

export function clampIndex(i: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(Number.isFinite(i) ? Math.trunc(i) : 0, 0), length - 1);
}

/** Playback progress 0..1 over the attested/modern stages (a single stage counts as complete). */
export function stageProgress(index: number, length: number): number {
  if (length <= 1) return 1;
  return clampIndex(index, length) / (length - 1);
}

/** Pressing play at the end restarts from the first stage; otherwise it resumes in place. */
export function playStartIndex(index: number, length: number): number {
  return length > 0 && index >= length - 1 ? 0 : clampIndex(index, length);
}

/** Always-visible uncertainty statement for a stage (never hidden inside a disclosure). */
export function uncertaintyText(s: HistoryStage): string {
  return s.status === 'attested'
    ? 'Độ chắc chắn: bản vẽ lại của cộng tác viên Wikimedia Commons, chưa đối chiếu độc lập với bản gốc.'
    : 'Hình hiện đại — không phải chứng cứ lịch sử.';
}

/** Returns a list of problems; empty means the dataset obeys the "no invented forms" rules. */
export function validateHistory(h: HanziHistory): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const s of h.stages) {
    if (ids.has(s.id)) errs.push(`duplicate stage ${s.id}`);
    ids.add(s.id);
    if (s.status === 'attested') {
      const e = s.evidence;
      if (!e.sourceUrl.startsWith('https://')) errs.push(`${s.id}: sourceUrl`);
      if (!e.licence || !e.licenceUrl) errs.push(`${s.id}: licence`);
      if (!/^[0-9a-f]{64}$/.test(e.sha256)) errs.push(`${s.id}: sha256`);
      if (!e.provenance) errs.push(`${s.id}: provenance`);
      if (!s.svg.d) errs.push(`${s.id}: svg`);
    }
    if (s.status === 'missing' && !s.missingReason) errs.push(`${s.id}: missingReason`);
  }
  if (!h.stages.some((s) => s.status === 'attested')) errs.push('no attested stage');
  return errs;
}
