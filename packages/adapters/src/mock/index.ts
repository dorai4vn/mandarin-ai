import type {
  InkRecognitionRequest,
  InkRecognitionResult,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  RealtimeSessionGrant,
} from '@mandarin/contracts';
import type { ConversationPort, DigitalInkPort, PronunciationAssessmentPort } from '../ports.js';

/**
 * MOCK adapters. Every result has `source: 'mock'`. They exist so flows can run without
 * credentials or devices; they must never be reported as live integration results.
 */
export class MockDigitalInk implements DigitalInkPort {
  constructor(private readonly fixedCandidates: string[] = ['山', '出', '屮']) {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async prepareModel(): Promise<boolean> {
    return true;
  }
  async recognize(request: InkRecognitionRequest): Promise<InkRecognitionResult> {
    return {
      source: 'mock',
      modelId: `mock:${request.languageTag}`,
      candidates: this.fixedCandidates.map((text) => ({ text, score: null })),
    };
  }
}

export class MockPronunciationAssessment implements PronunciationAssessmentPort {
  async assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    return {
      source: 'mock',
      provider: 'mock',
      recognitionStatus: 'MockSuccess',
      recognizedText: null,
      // Mock deliberately returns no scores: inventing numbers would look like real feedback.
      scores: {
        accuracy: null,
        fluency: null,
        completeness: null,
        prosody: null,
        pronunciation: null,
      },
      words: [...request.referenceText].map((word) => ({ word, accuracy: null, errorType: null })),
    };
  }
}

export class MockConversation implements ConversationPort {
  constructor(private readonly now: () => Date = () => new Date()) {}
  async createSessionGrant(): Promise<RealtimeSessionGrant> {
    return {
      source: 'mock',
      clientSecret: 'mock_not_a_real_secret',
      expiresAt: new Date(this.now().getTime() + 60_000).toISOString(),
      model: 'mock-realtime',
    };
  }
}
