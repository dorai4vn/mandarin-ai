import {
  ApiErrorSchema,
  ContentSnapshotSchema,
  HandwritingRecognitionResultSchema,
  HealthResponseSchema,
  PdfUploadResultSchema,
  PronunciationAssessmentResultSchema,
  RealtimeSessionGrantSchema,
  SyncPullResponseSchema,
  SyncPushResponseSchema,
  type HandwritingRecognitionRequest,
  type PronunciationAssessmentRequest,
  type SyncOperation,
} from '@mandarin/contracts';
import { getAccessToken } from './session';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787').replace(
  /\/$/,
  '',
);

export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiCallError';
  }
}

async function call<T>(
  path: string,
  parse: (v: unknown) => T,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiCallError(401, 'not_signed_in');
    headers.set('Authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(30_000),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError')
      throw new ApiCallError(0, 'timeout');
    throw new ApiCallError(0, navigator.onLine === false ? 'offline' : 'network_unreachable');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new ApiCallError(res.status, parsed.success ? parsed.data.error.code : 'unknown_error');
  }
  return parse(body);
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  health: () => call('/health', (v) => HealthResponseSchema.parse(v), {}, false),
  recognizeHandwriting: (req: HandwritingRecognitionRequest) =>
    call(
      '/v1/handwriting/recognize',
      (v) => HandwritingRecognitionResultSchema.parse(v),
      json(req),
    ),
  contentVersion: () =>
    call('/v1/content/version', (v) => String((v as { version?: unknown }).version ?? '')),
  content: () => call('/v1/content', (v) => ContentSnapshotSchema.parse(v)),
  syncPull: (after: number) =>
    call(`/v1/sync/pull?after=${after}&limit=200`, (v) => SyncPullResponseSchema.parse(v)),
  syncPush: (operations: SyncOperation[]) =>
    call('/v1/sync/push', (v) => SyncPushResponseSchema.parse(v), json({ operations })),
  uploadPdf: (file: Blob) =>
    call('/v1/uploads/pdf', (v) => PdfUploadResultSchema.parse(v), {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      // Streams the File from disk (no full read on the main thread). 50 MB on a slow mobile
      // uplink can take minutes (D-040).
      body: file,
      signal: AbortSignal.timeout(300_000),
    }),
  assessPronunciation: (req: PronunciationAssessmentRequest) =>
    call(
      '/v1/speech/pronunciation-assessment',
      (v) => PronunciationAssessmentResultSchema.parse(v),
      json(req),
    ),
  realtimeSession: () =>
    call('/v1/voice/realtime-session', (v) => RealtimeSessionGrantSchema.parse(v), {
      method: 'POST',
    }),
};

/** The server answered that a feature is not enabled there (503 provider_unavailable). */
export function isProviderUnavailable(e: unknown): boolean {
  return e instanceof ApiCallError && e.status === 503 && e.code === 'provider_unavailable';
}

/** Vietnamese message for an API error. */
export function describeApiError(e: unknown): string {
  if (!(e instanceof ApiCallError)) return e instanceof Error ? e.message : String(e);
  switch (e.code) {
    case 'not_signed_in':
      return 'Bạn chưa đăng nhập (vào mục Phiên đăng nhập).';
    case 'offline':
      return 'Thiết bị đang offline.';
    case 'timeout':
      return 'Máy chủ phản hồi quá lâu (mạng chậm?). Hãy thử lại.';
    case 'network_unreachable':
      return 'Không kết nối được máy chủ API.';
    case 'unauthenticated':
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
    case 'rate_limited':
      return 'Bạn thao tác quá nhanh, hãy thử lại sau ít phút.';
    case 'provider_unavailable':
      return 'Dịch vụ này chưa được cấu hình trên máy chủ.';
    case 'not_a_pdf':
      return 'Tệp không phải PDF hợp lệ.';
    case 'payload_too_large':
    case 'provider_http_error':
      if (e.status === 413) return 'Tệp vượt giới hạn 50 MB mỗi tệp PDF.';
      return `Lỗi máy chủ (${e.status} ${e.code}).`;
    case 'unsupported_media_type':
      return 'Chỉ nhận tệp PDF.';
    default:
      return `Lỗi máy chủ (${e.status} ${e.code}).`;
  }
}
