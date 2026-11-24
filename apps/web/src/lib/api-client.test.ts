import { describe, expect, it } from 'vitest';
import { ApiCallError, describeApiError } from './api-client';

describe('upload error messages (D-040)', () => {
  it('explains the 50 MB limit for server-side 413s', () => {
    expect(describeApiError(new ApiCallError(413, 'payload_too_large'))).toBe(
      'Tệp vượt giới hạn 50 MB mỗi tệp PDF.',
    );
    expect(describeApiError(new ApiCallError(413, 'provider_http_error'))).toBe(
      'Tệp vượt giới hạn 50 MB mỗi tệp PDF.',
    );
  });

  it('keeps other storage failures generic and explains timeouts and wrong types', () => {
    expect(describeApiError(new ApiCallError(502, 'provider_http_error'))).toBe(
      'Lỗi máy chủ (502 provider_http_error).',
    );
    expect(describeApiError(new ApiCallError(0, 'timeout'))).toMatch(/quá lâu/);
    expect(describeApiError(new ApiCallError(415, 'unsupported_media_type'))).toBe(
      'Chỉ nhận tệp PDF.',
    );
    expect(describeApiError(new ApiCallError(422, 'not_a_pdf'))).toBe('Tệp không phải PDF hợp lệ.');
  });
});
