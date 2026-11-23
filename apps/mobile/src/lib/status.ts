import type { ResultSource, SpikeStatus } from '@mandarin/contracts';

/**
 * In-app label for a spike result. The app can only say "LIVE (chưa xác minh)":
 * VERIFIED is granted in the M0 report only with owner-provided device evidence.
 */
export function labelForResult(
  source: ResultSource | null,
  error?: string | null,
): {
  status: SpikeStatus | 'LIVE_UNCONFIRMED';
  text: string;
} {
  if (error) return { status: 'BLOCKED', text: `BLOCKED — ${error}` };
  if (source === 'mock')
    return { status: 'MOCKED', text: 'MOCK — kết quả giả lập, không phải tích hợp thật' };
  if (source === 'live')
    return {
      status: 'LIVE_UNCONFIRMED',
      text: 'LIVE — cần bằng chứng trên iPhone thật để VERIFIED',
    };
  return { status: 'UNTESTED', text: 'Chưa chạy' };
}
