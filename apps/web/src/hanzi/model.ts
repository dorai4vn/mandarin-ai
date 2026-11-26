import type { HanziHistory, HistoryStage } from './types';

/** Stages that animation steps through: attested history first, then the modern form. Missing stages are never played. */
export function playableStages(h: HanziHistory): HistoryStage[] {
  return h.stages.filter((s) => s.status !== 'missing');
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
