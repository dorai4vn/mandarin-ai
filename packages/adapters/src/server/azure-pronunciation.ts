import type {
  PronunciationAssessmentRequest,
  PronunciationAssessmentResult,
} from '@mandarin/contracts';
import { ProviderError, type FetchLike, type PronunciationAssessmentPort } from '../ports.js';

export interface AzurePronunciationConfig {
  /** Speech resource key. Server-side only. */
  key: string;
  /** Azure region, e.g. `southeastasia`. */
  region: string;
  fetch?: FetchLike;
  /** Request timeout in ms. */
  timeoutMs?: number;
}

const MAX_AUDIO_BYTES = 1_000_000; // ~30 s of 16 kHz mono PCM

/** Encodes the Pronunciation-Assessment header (base64 JSON) per the Speech REST API. */
export function buildPronunciationHeader(referenceText: string): string {
  const params = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableProsodyAssessment: 'True',
  };
  return Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

interface AzureNBest {
  Display?: string;
  AccuracyScore?: number;
  FluencyScore?: number;
  CompletenessScore?: number;
  ProsodyScore?: number;
  PronScore?: number;
  PronunciationAssessment?: Record<string, unknown>;
  Words?: Array<{
    Word?: string;
    AccuracyScore?: number;
    ErrorType?: string;
    PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
  }>;
}

/** Maps an Azure REST response to the contract, keeping missing dimensions as null. */
export function mapAzureResponse(body: unknown): PronunciationAssessmentResult {
  const root = (body ?? {}) as { RecognitionStatus?: string; NBest?: AzureNBest[] };
  const best = root.NBest?.[0];
  const pa = (best?.PronunciationAssessment ?? best ?? {}) as Record<string, unknown>;
  return {
    source: 'live',
    provider: 'azure-speech',
    recognitionStatus: root.RecognitionStatus ?? 'Unknown',
    recognizedText: best?.Display ?? null,
    scores: {
      accuracy: num(pa['AccuracyScore']),
      fluency: num(pa['FluencyScore']),
      completeness: num(pa['CompletenessScore']),
      prosody: num(pa['ProsodyScore']),
      pronunciation: num(pa['PronScore']),
    },
    words: (best?.Words ?? []).map((w) => ({
      word: w.Word ?? '',
      accuracy: num(w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore),
      errorType: w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? null,
    })),
  };
}

/** Azure AI Speech REST (short audio) pronunciation assessment. Server-side only. */
export class AzurePronunciationAssessment implements PronunciationAssessmentPort {
  private readonly fetchImpl: FetchLike;
  constructor(private readonly config: AzurePronunciationConfig) {
    if (!/^[a-z0-9]+$/.test(config.region)) throw new Error('Invalid Azure region');
    this.fetchImpl = config.fetch ?? fetch;
  }

  async assess(request: PronunciationAssessmentRequest): Promise<PronunciationAssessmentResult> {
    const audio = Buffer.from(request.audioBase64, 'base64');
    if (audio.byteLength === 0 || audio.byteLength > MAX_AUDIO_BYTES) {
      throw new ProviderError('azure-speech', 'audio_size', 'Audio is empty or too large', 413);
    }
    const url =
      `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/` +
      `cognitiveservices/v1?language=${encodeURIComponent(request.locale)}&format=detailed`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
        'Pronunciation-Assessment': buildPronunciationHeader(request.referenceText),
      },
      body: audio,
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000),
    });
    if (!res.ok) {
      throw new ProviderError(
        'azure-speech',
        'http_error',
        `Azure returned ${res.status}`,
        res.status,
      );
    }
    return mapAzureResponse(await res.json());
  }
}
