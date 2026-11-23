import { z } from 'zod';

/** PDF upload limits for the M0 spike (resumable uploads for large files arrive in M4). */
export const PDF_UPLOAD_LIMITS = { maxBytes: 20 * 1024 * 1024, mimeType: 'application/pdf' } as const;

/** Every PDF starts with `%PDF-`. Used on both client and server. */
export function looksLikePdf(firstBytes: Uint8Array): boolean {
  const sig = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return sig.every((b, i) => firstBytes[i] === b);
}

export const PdfUploadResultSchema = z.object({
  source: z.enum(['live', 'mock']),
  storagePath: z.string(),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type PdfUploadResult = z.infer<typeof PdfUploadResultSchema>;
