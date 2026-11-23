import {
  MockConversation,
  MockPronunciationAssessment,
  type ConversationPort,
  type PronunciationAssessmentPort,
} from '@mandarin/adapters';
import { AzurePronunciationAssessment, OpenAIRealtimeSessions } from '@mandarin/adapters/server';
import type { AppConfig } from './config.js';

export interface Providers {
  conversation: { port: ConversationPort; mode: 'live' | 'mock' } | null;
  pronunciation: { port: PronunciationAssessmentPort; mode: 'live' | 'mock' } | null;
}

/** Chooses live adapters when credentials exist; otherwise labelled mocks (dev) or null (503). */
export function createProviders(config: AppConfig): Providers {
  const allowMock = config.MISSING_PROVIDER_MODE === 'mock';
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
  };
}
