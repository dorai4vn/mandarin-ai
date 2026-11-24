import { describe, expect, it } from 'vitest';
import { PDF_UPLOAD_LIMITS, checkPdfSize, looksLikePdf } from './upload.js';

const MiB = 1024 * 1024;
const bytes = (ascii: string) => Uint8Array.from(ascii, (c) => c.charCodeAt(0));

describe('PDF upload limit (D-040)', () => {
  it('is 50 MiB = 52 428 800 bytes, shown as 50 MB', () => {
    expect(PDF_UPLOAD_LIMITS.maxBytes).toBe(52_428_800);
    expect(PDF_UPLOAD_LIMITS.maxLabel).toBe('50 MB');
  });

  it('accepts 20 MB, 49 MB and exactly 50 MB; rejects one byte more', () => {
    expect(checkPdfSize(20 * MiB)).toBe('ok');
    expect(checkPdfSize(49 * MiB)).toBe('ok');
    expect(checkPdfSize(50 * MiB)).toBe('ok');
    expect(checkPdfSize(50 * MiB + 1)).toBe('too_large');
    expect(checkPdfSize(200 * MiB)).toBe('too_large');
  });

  it('treats empty or nonsense sizes as empty', () => {
    expect(checkPdfSize(0)).toBe('empty');
    expect(checkPdfSize(-1)).toBe('empty');
    expect(checkPdfSize(Number.NaN)).toBe('empty');
  });

  it('recognises the %PDF- signature only', () => {
    expect(looksLikePdf(bytes('%PDF-1.7'))).toBe(true);
    expect(looksLikePdf(bytes('<html>'))).toBe(false);
    expect(looksLikePdf(new Uint8Array(0))).toBe(false);
  });
});
