import data from './artworkRemediation.json';
import type { DiagramSpec } from './countingLayout';

/**
 * Remediation matrix for the 53 active candidates that the semantic audit (docs/M3_5_SEMANTIC_AUDIT.md)
 * rated FAIL/UNCERTAIN. Zero-cost, display-only: it never promotes, hides or replaces any image file and
 * never changes artwork.status. "replace-brief" rows are proposals awaiting owner review (no generation).
 */
export type RemediationAction =
  | 'contextual-card'
  | 'counting-diagram'
  | 'contrast-card'
  | 'replace-brief'
  | 'retain-with-caption';

export interface Example {
  zh: string;
  pinyin: string;
  vi: string;
}

export interface Remediation {
  hanzi: string;
  order: number;
  prelimVerdict: 'FAIL' | 'UNCERTAIN';
  action: RemediationAction;
  reasonVi: string;
  card?: Example & {
    noteVi: string;
    /** Contrast partner (今/昨, 租/买). */
    contrast?: Example & { label: string };
    /** Additional examples (e.g. 只 zhǐ vs zhī, 机 compounds). */
    more?: Example[];
  };
  /** Deterministic SVG counting diagram (五 六 九 十 百 千 零). */
  diagram?: DiagramSpec;
  replacement?: { prompt: string; acceptance: string[] };
  captionVi?: string;
}

export const REMEDIATION = data as Remediation[];
export const REMEDIATION_BY_HANZI: ReadonlyMap<string, Remediation> = new Map(
  REMEDIATION.map((r) => [r.hanzi, r]),
);

export const ACTION_LABEL: Record<RemediationAction, string> = {
  'contextual-card': 'Thẻ ngữ cảnh',
  'counting-diagram': 'Sơ đồ đếm SVG',
  'contrast-card': 'Thẻ đối chiếu',
  'replace-brief': 'Đề xuất thay ảnh (chờ chủ dự án)',
  'retain-with-caption': 'Giữ ứng viên kèm chú thích',
};

/** Estimated cost per image from the ledger ($ per image, estimate, not billing). */
export const EST_COST_PER_IMAGE_USD = 0.0195;
export const LEDGER_CUMULATIVE_USD = 4.9335;
export const BUDGET_USD = 6;
