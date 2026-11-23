import type {
  InkRecognitionRequest,
  InkRecognitionResult,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  RealtimeSessionGrant,
} from '@mandarin/contracts';

/** Handwriting recognition from vector strokes (not image OCR). Implemented natively on iOS. */
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
