// M3.6 Phase A — artwork automation contracts (mock-first, D-044).
// Mock output is NEVER a real illustration and NEVER historical evidence.

export type ArtworkProviderKind = 'mock' | 'real';

export interface ArtworkRequest {
  readonly subjectId: string;
  readonly prompt: string;
  readonly style: string;
  readonly seed: number;
}

export interface ProviderImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  /** Abstract cost units charged for this generation (0 for mock). */
  readonly costUnits: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ArtworkProvider {
  readonly id: string;
  readonly kind: ArtworkProviderKind;
  estimateCost(req: ArtworkRequest): number;
  generate(req: ArtworkRequest, opts: { signal: AbortSignal }): Promise<ProviderImage>;
}

/** Historical evidence is a distinct record, never mixed into generated-asset provenance. */
export interface HistoricalEvidenceRef {
  readonly sourceTitle: string;
  readonly citation: string;
  readonly license: string;
}

export interface ArtworkProvenance {
  readonly source: 'mock' | 'ai_generated';
  readonly providerId: string;
  readonly promptSha256: string;
  readonly seed: number;
  readonly createdAt: string;
  /** True for mock output: placeholder, must not be shown as a real illustration. */
  readonly placeholder: boolean;
  /** Generated art is never evidence; evidence lives in `historicalEvidence` only when curated by a human. */
  readonly isHistoricalEvidence: false;
  readonly historicalEvidence: readonly HistoricalEvidenceRef[];
}

export interface ArtworkMetadata {
  readonly format: 'webp';
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly encoder: string;
}

export interface ArtworkResult {
  readonly storageKey: string;
  readonly metadata: ArtworkMetadata;
  readonly provenance: ArtworkProvenance;
  readonly qc: QcReport;
}

export interface QcIssue {
  readonly code: string;
  readonly message: string;
}
export interface QcReport {
  readonly passed: boolean;
  readonly issues: readonly QcIssue[];
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ArtworkJob {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly request: ArtworkRequest;
  status: JobStatus;
  attempts: number;
  /** Earliest time (ms epoch) the job may be claimed. */
  availableAt: number;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
  lastError: string | null;
  result: ArtworkResult | null;
}

export interface ArtworkQueue {
  /** Idempotent: same key returns the existing job and never creates a second. */
  enqueue(idempotencyKey: string, request: ArtworkRequest): ArtworkJob;
  /** Claims the next due job (also reclaims expired leases = resume after crash). */
  claim(workerId: string, leaseMs: number): ArtworkJob | null;
  succeed(id: string, workerId: string, result: ArtworkResult): boolean;
  /** Re-queue with backoff, or mark failed when `retryAt` is null. */
  fail(id: string, workerId: string, error: string, retryAt: number | null): boolean;
  cancel(id: string): boolean;
  /** Re-queue a failed/cancelled job (admin regenerate). Resets attempts. */
  requeue(id: string): boolean;
  get(id: string): ArtworkJob | undefined;
  list(): readonly ArtworkJob[];
}

export interface ArtworkStorage {
  /** Content-addressed and idempotent; rejects bytes not matching `sha256`. */
  put(key: string, bytes: Uint8Array, contentType: string, sha256: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
