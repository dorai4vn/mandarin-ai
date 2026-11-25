import type {
  HandwritingRecognitionRequestParsed,
  HandwritingRecognitionResult,
  InkRecognitionRequest,
  InkRecognitionResult,
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
  RealtimeSessionGrant,
  SyncOperation,
} from '@mandarin/contracts';
import type {
  ConversationPort,
  DigitalInkPort,
  HandwritingRecognitionPort,
  ObjectStoragePort,
  PronunciationAssessmentPort,
  SyncCaller,
  SyncOperationStore,
  SyncPushResult,
} from '../ports.js';

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

/** MOCK handwriting recognizer: fixed candidates, labelled `mock`. */
export class MockHandwritingRecognizer implements HandwritingRecognitionPort {
  readonly id = 'mock';
  constructor(private readonly fixed: string[] = ['山', '出', '屮']) {}
  isReady(): boolean {
    return true;
  }
  async recognize(req: HandwritingRecognitionRequestParsed): Promise<HandwritingRecognitionResult> {
    return {
      source: 'mock',
      adapterId: this.id,
      candidates: this.fixed.slice(0, req.limit).map((text) => ({ text, score: null })),
      scoreOrder: 'none',
      latencyMs: 0,
    };
  }
}

/**
 * In-memory object storage (MOCK, development only). Bounded by total bytes (oldest objects are
 * evicted first) so repeated 50 MB test uploads cannot exhaust the dev server's memory.
 */
export class MemoryObjectStorage implements ObjectStoragePort {
  readonly mode = 'mock' as const;
  readonly objects = new Map<string, { body: Uint8Array; contentType: string }>();
  private totalBytes = 0;
  constructor(private readonly maxTotalBytes = 256 * 1024 * 1024) {}
  async put(path: string, body: Uint8Array, contentType: string): Promise<void> {
    const previous = this.objects.get(path);
    if (previous) {
      this.totalBytes -= previous.body.byteLength;
      this.objects.delete(path);
    }
    this.objects.set(path, { body, contentType });
    this.totalBytes += body.byteLength;
    for (const [key, value] of this.objects) {
      if (this.totalBytes <= this.maxTotalBytes || key === path) break;
      this.objects.delete(key);
      this.totalBytes -= value.body.byteLength;
    }
  }
  get storedBytes(): number {
    return this.totalBytes;
  }
}

/**
 * In-memory sync store (MOCK, local development / E2E only). Same semantics as the Postgres
 * `sync_operations` table + `sync_push()` (M1): globally unique operation ids, per-user pull order.
 */
export class MemorySyncOperationStore implements SyncOperationStore {
  readonly mode = 'mock' as const;
  private readonly ops = new Map<string, { userId: string; op: SyncOperation; version: number }>();
  private version = 0;

  /** Bounded so a public preview cannot be used to exhaust server memory. Lost on restart. */
  constructor(private readonly maxOperations = 10_000) {}

  async push(caller: SyncCaller, ops: SyncOperation[]): Promise<SyncPushResult[]> {
    return ops.map((op) => {
      const base = { operationId: op.operationId };
      const existing = this.ops.get(op.operationId);
      if (existing) {
        return existing.userId === caller.userId
          ? { ...base, status: 'duplicate' as const, serverVersion: existing.version, error: null }
          : {
              ...base,
              status: 'rejected' as const,
              serverVersion: null,
              error: 'operation_id_conflict',
            };
      }
      if (this.ops.size >= this.maxOperations) {
        return {
          ...base,
          status: 'rejected' as const,
          serverVersion: null,
          error: 'mock_store_full',
        };
      }
      this.version += 1;
      this.ops.set(op.operationId, { userId: caller.userId, op, version: this.version });
      return { ...base, status: 'applied' as const, serverVersion: this.version, error: null };
    });
  }

  async pull(caller: SyncCaller, after: number, limit: number) {
    const mine = [...this.ops.values()]
      .filter((o) => o.userId === caller.userId && o.version > after)
      .sort((a, b) => a.version - b.version);
    return {
      operations: mine.slice(0, limit).map((o) => ({ ...o.op, serverSeq: o.version })),
      hasMore: mine.length > limit,
    };
  }

  countFor(userId: string): number {
    return [...this.ops.values()].filter((o) => o.userId === userId).length;
  }
}
