import {
  ApiErrorSchema,
  HealthResponseSchema,
  PronunciationAssessmentResultSchema,
  RealtimeSessionGrantSchema,
  type HealthResponse,
  type PronunciationAssessmentRequest,
  type PronunciationAssessmentResult,
  type RealtimeSessionGrant,
} from '@mandarin/contracts';
import Constants from 'expo-constants';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:8787';

export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`API ${status}: ${code}`);
  }
}

async function call<T>(path: string, parse: (v: unknown) => T, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new ApiCallError(0, 'network_unreachable');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new ApiCallError(res.status, parsed.success ? parsed.data.error.code : 'unknown_error');
  }
  return parse(body);
}

const authed = (token: string, body?: unknown): RequestInit => ({
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  health: (): Promise<HealthResponse> => call('/health', (v) => HealthResponseSchema.parse(v)),
  realtimeSession: (token: string): Promise<RealtimeSessionGrant> =>
    call('/v1/voice/realtime-session', (v) => RealtimeSessionGrantSchema.parse(v), authed(token)),
  assessPronunciation: (
    token: string,
    req: PronunciationAssessmentRequest,
  ): Promise<PronunciationAssessmentResult> =>
    call(
      '/v1/speech/pronunciation-assessment',
      (v) => PronunciationAssessmentResultSchema.parse(v),
      authed(token, req),
    ),
};
