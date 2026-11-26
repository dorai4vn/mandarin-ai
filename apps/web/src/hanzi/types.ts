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

export interface AttestedStage {
  id: string;
  label: string;
  period: string;
  status: 'attested';
  svg: { viewBox: string; d: string };
  evidence: StageEvidence;
}
export interface MissingStage {
  id: string;
  label: string;
  period: string;
  status: 'missing';
  missingReason: string;
}
/** Modern form: rendered with the app font, not a historical image. */
export interface ModernStage {
  id: string;
  label: string;
  period: string;
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
