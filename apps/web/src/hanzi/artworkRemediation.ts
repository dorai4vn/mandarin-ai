import data from './artworkRemediation.json';

/**
 * Remediation matrix for the 53 active candidates that the semantic audit (docs/M3_5_SEMANTIC_AUDIT.md)
 * rated FAIL/UNCERTAIN. Zero-cost, display-only: it never promotes, hides or replaces any image file and
 * never changes artwork.status. "replace-brief" rows are proposals awaiting owner review (no generation).
 */
export type RemediationAction = 'contextual-card' | 'replace-brief' | 'retain-with-caption';

export interface Remediation {
  hanzi: string;
  order: number;
  prelimVerdict: 'FAIL' | 'UNCERTAIN';
  action: RemediationAction;
  reasonVi: string;
  card?: { zh: string; pinyin: string; vi: string; noteVi: string };
  replacement?: { prompt: string; acceptance: string[] };
  captionVi?: string;
}

export const REMEDIATION = data as Remediation[];
export const REMEDIATION_BY_HANZI: ReadonlyMap<string, Remediation> = new Map(
  REMEDIATION.map((r) => [r.hanzi, r]),
);

export const ACTION_LABEL: Record<RemediationAction, string> = {
  'contextual-card': 'Thẻ ngữ cảnh',
  'replace-brief': 'Đề xuất thay ảnh (chờ chủ dự án)',
  'retain-with-caption': 'Giữ ứng viên kèm chú thích',
};

/** Estimated cost per image from the ledger ($ per image, estimate, not billing). */
export const EST_COST_PER_IMAGE_USD = 0.0195;
export const LEDGER_CUMULATIVE_USD = 4.9335;
export const BUDGET_USD = 6;
