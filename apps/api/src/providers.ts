import {
  MemoryObjectStorage,
  MemorySyncOperationStore,
  MockConversation,
  MockHandwritingRecognizer,
  MockPronunciationAssessment,
  type ConversationPort,
  type HandwritingRecognitionPort,
  type ObjectStoragePort,
  type PronunciationAssessmentPort,
  type SyncOperationStore,
} from '@mandarin/adapters';
import {
  AzurePronunciationAssessment,
  HanziLookupRecognizer,
  OpenAIRealtimeSessions,
  SupabaseObjectStorage,
} from '@mandarin/adapters/server';
import type { AppConfig } from './config.js';

export interface Providers {
  conversation: { port: ConversationPort; mode: 'live' | 'mock' } | null;
  pronunciation: { port: PronunciationAssessmentPort; mode: 'live' | 'mock' } | null;
  handwriting: { port: HandwritingRecognitionPort; mode: 'live' | 'mock' } | null;
  storage: ObjectStoragePort | null;
  /** M0: in-memory (mock) until the Postgres sync_operations table lands in M1. */
  sync: SyncOperationStore | null;
}

/** Chooses live adapters when credentials exist; otherwise labelled mocks (dev) or null (503). */
export function createProviders(config: AppConfig): Providers {
  const allowMock = config.MISSING_PROVIDER_MODE === 'mock';
  // Stateful mocks (sync store, object storage) keep learner data in RAM and lose it on restart.
  // They are allowed ONLY in local development — never in preview or production, even when
  // ALLOW_MOCKS_IN_PREVIEW=true — so real study data can never be "acknowledged" by a mock.
  const allowStatefulMock = allowMock && config.appEnv === 'development';
  return {
    conversation: config.OPENAI_API_KEY
      ? {
          mode: 'live',
          port: new OpenAIRealtimeSessions({
            apiKey: config.OPENAI_API_KEY,
            model: config.OPENAI_REALTIME_MODEL,
            ttlSeconds: config.OPENAI_REALTIME_TTL_SECONDS,
          }),
        }
      : allowMock
        ? { mode: 'mock', port: new MockConversation() }
        : null,
    pronunciation: config.AZURE_SPEECH_KEY
      ? {
          mode: 'live',
          port: new AzurePronunciationAssessment({
            key: config.AZURE_SPEECH_KEY,
            region: config.AZURE_SPEECH_REGION,
          }),
        }
      : allowMock
        ? { mode: 'mock', port: new MockPronunciationAssessment() }
        : null,
    handwriting: handwriting(config, allowMock),
    storage:
      config.SUPABASE_URL && config.supabaseSecretKey
        ? new SupabaseObjectStorage({
            url: config.SUPABASE_URL,
            secretKey: config.supabaseSecretKey,
            bucket: config.STORAGE_BUCKET,
          })
        : allowStatefulMock
          ? new MemoryObjectStorage()
          : null,
    sync: allowStatefulMock ? new MemorySyncOperationStore() : null,
  };
}

function handwriting(config: AppConfig, allowMock: boolean): Providers['handwriting'] {
  switch (config.HANDWRITING_ADAPTER) {
    case 'hanzilookup': {
      // Licence review pending (D-029): never enabled implicitly, refused in production by config.
      if (!config.HANDWRITING_DATA_PATH) return null;
      const live = new HanziLookupRecognizer(config.HANDWRITING_DATA_PATH);
      return live.isReady() ? { mode: 'live', port: live } : null;
    }
    case 'mock':
      return allowMock ? { mode: 'mock', port: new MockHandwritingRecognizer() } : null;
    default:
      return null;
  }
}
