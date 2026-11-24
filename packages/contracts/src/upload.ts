import { z } from 'zod';

/**
 * PDF upload limit (D-040): 50 MB per file = 50 MiB = 52 428 800 bytes, inclusive. Single source of
 * truth for the web client, the API body limit and docs; it must not exceed the Supabase Storage
 * upload limit of the project (local `supabase/config.toml` storage.file_size_limit = "50MiB").
 */
export const PDF_UPLOAD_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  /** What users see. Supabase and most file managers count 1 MB = 1 MiB here. */
  maxLabel: '50 MB',
  mimeType: 'application/pdf',
} as const;

export type PdfSizeCheck = 'ok' | 'empty' | 'too_large';

/** Size gate shared by client and server: 1 byte ≤ size ≤ maxBytes. */
export function checkPdfSize(sizeBytes: number): PdfSizeCheck {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 'empty';
  return sizeBytes > PDF_UPLOAD_LIMITS.maxBytes ? 'too_large' : 'ok';
}

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
