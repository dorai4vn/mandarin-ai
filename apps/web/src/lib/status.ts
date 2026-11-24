import type { ResultSource, SpikeStatus } from '@mandarin/contracts';

export type Label = { status: SpikeStatus | 'LIVE_UNCONFIRMED'; text: string };

/** The app can only say "LIVE"; VERIFIED needs owner-provided device evidence in the report. */
export function labelForResult(source: ResultSource | null, error?: string | null): Label {
  if (error) return { status: 'BLOCKED', text: `Lỗi — ${error}` };
  if (source === 'mock')
    return { status: 'MOCKED', text: 'MOCK — kết quả giả lập, không phải tích hợp thật' };
  if (source === 'live')
    return { status: 'LIVE_UNCONFIRMED', text: 'LIVE — kết quả thật từ máy chủ' };
  return { status: 'UNTESTED', text: 'Chưa chạy' };
}
