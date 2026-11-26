import type { HanziHistory, HistoryStage } from './types';

/** Stages that animation steps through: attested history first, then the modern form. Missing stages are never played. */
export function playableStages(h: HanziHistory): HistoryStage[] {
  return h.stages.filter((s) => s.status !== 'missing');
}

export function nextIndex(current: number, length: number): number | null {
  return current + 1 < length ? current + 1 : null;
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
