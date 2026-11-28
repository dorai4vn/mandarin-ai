export type ReviewStatus = 'pending_owner_review' | 'reviewed';

export interface StageEvidence {
  sourceTitle: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
  contributor: string;
  retrievedOn: string;
  sha256: string;
  provenance: string;
  reviewStatus: ReviewStatus;
}

interface StageBase {
  id: string;
  label: string;
  /** Full dating text (Explore). */
  period: string;
  /** Compact date for the fixed-height thumbnail row (e.g. "~13–11 TCN"). Absent = shown as "chưa rõ". */
  periodShort?: string;
  /** Approximate start year (negative = BCE) ONLY when supported by the source/period text; used for chronological order. */
  sortYear?: number;
  /** Parallel script tradition/variant group. Absent = main line. Parallel stages are grouped, never linear evolution. */
  track?: string;
}

export interface AttestedStage extends StageBase {
  status: 'attested';
  svg: { viewBox: string; d: string };
  evidence: StageEvidence;
}
export interface MissingStage extends StageBase {
  status: 'missing';
  missingReason: string;
}
/** Modern form: rendered with the app font, not a historical image. */
export interface ModernStage extends StageBase {
  status: 'modern';
  note: string;
}
export type HistoryStage = AttestedStage | MissingStage | ModernStage;

export interface HanziHistory {
  glyph: string;
  meaningVi: string;
  stages: HistoryStage[];
  skippedSources: { title: string; reason: string }[];
  /** Mnemonic is never evidence (PRD-03). */
  mnemonic: { text: string; isHistoricalEvidence: false } | null;
  /** Stroke order is a separate feature; gap documented when unavailable. */
  strokeOrder: { available: false; note: string };
}
