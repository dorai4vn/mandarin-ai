import type {
  HandwritingRecognitionRequestParsed,
  HandwritingRecognitionResult,
  InkRecognitionRequest,
  InkRecognitionResult,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  PulledSyncOperation,
  RealtimeSessionGrant,
  SyncOperation,
} from '@mandarin/contracts';

/**
 * Cross-platform handwriting recognition from vector strokes (touch, mouse, pen) — D-020/D-029.
 * Implementations may run on the server (default) or in the browser.
 */
export interface HandwritingRecognitionPort {
  readonly id: string;
  /** True when the adapter is ready (data loaded, credentials present). */
  isReady(): boolean;
  recognize(request: HandwritingRecognitionRequestParsed): Promise<HandwritingRecognitionResult>;
}

/** @deprecated Native ML Kit port of the frozen Expo spike; use HandwritingRecognitionPort. */
export interface DigitalInkPort {
  isAvailable(): Promise<boolean>;
  /** Ensures the language model is downloaded. Returns false when it cannot be prepared. */
  prepareModel(languageTag: string): Promise<boolean>;
  recognize(request: InkRecognitionRequest): Promise<InkRecognitionResult>;
}

/** Reference-text pronunciation assessment (Azure AI Speech on the server). */
export interface PronunciationAssessmentPort {
  assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult>;
}

/** Issues short-lived credentials for a voice conversation session (OpenAI Realtime, D-004). */
export interface ConversationPort {
  createSessionGrant(options: { userId: string }): Promise<RealtimeSessionGrant>;
}

/** Binary object storage for private learner files (PDF, audio). */
export interface ObjectStoragePort {
  readonly mode: 'live' | 'mock';
  put(path: string, body: Uint8Array, contentType: string): Promise<void>;
}

/** Who is syncing: the verified user id and their own access token (RLS runs as them). */
export interface SyncCaller {
  userId: string;
  accessToken: string;
}

export type SyncPushResult = {
  operationId: string;
  status: 'applied' | 'duplicate' | 'rejected';
  serverVersion: number | null;
  error: string | null;
};

/** Server-side store for outbox operations (D-021, M1 `sync_operations`). */
export interface SyncOperationStore {
  readonly mode: 'live' | 'mock';
  /**
   * Stores each operation once per `operationId` (results in input order): `duplicate` when the
   * caller already stored it, `rejected` when the id belongs to another user (nothing revealed).
   */
  push(caller: SyncCaller, ops: SyncOperation[]): Promise<SyncPushResult[]>;
  /** The caller's operations with `serverSeq > after`, ascending, at most `limit`. */
  pull(
    caller: SyncCaller,
    after: number,
    limit: number,
  ): Promise<{ operations: PulledSyncOperation[]; hasMore: boolean }>;
}

/** Minimal fetch signature so adapters can be tested without network access. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
