import { sha256Hex } from './mock-provider.js';
import { readWebpHeader } from './processing.js';
import type { ArtworkMetadata, ArtworkProvenance, QcIssue, QcReport } from './types.js';

export const MAX_BYTES = 2 * 1024 * 1024;

export function runQc(
  bytes: Uint8Array,
  metadata: ArtworkMetadata,
  provenance: ArtworkProvenance,
): QcReport {
  const issues: QcIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const header = readWebpHeader(bytes);
  if (!header) add('not_webp', 'not a RIFF/WEBP container');
  else {
    if (header.width * 3 !== header.height * 4) add('aspect', 'canvas is not 4:3');
    if (header.width !== metadata.width || header.height !== metadata.height)
      add('metadata_mismatch', 'metadata dimensions differ from header');
    if (provenance.placeholder !== header.mock)
      add('label_mismatch', 'placeholder flag does not match payload');
  }
  if (bytes.length === 0 || bytes.length > MAX_BYTES) add('size', 'byte size out of bounds');
  if (metadata.bytes !== bytes.length) add('metadata_bytes', 'metadata byte count mismatch');
  if (sha256Hex(bytes) !== metadata.sha256) add('checksum', 'checksum mismatch');
  if (provenance.source === 'mock' && !provenance.placeholder)
    add('mock_unlabelled', 'mock asset must be labelled placeholder');
  if (provenance.source === 'mock' && provenance.historicalEvidence.length > 0)
    add('mock_evidence', 'mock asset must not carry historical evidence');
  if (provenance.isHistoricalEvidence !== false)
    add('evidence', 'generated asset cannot be historical evidence');
  return { passed: issues.length === 0, issues };
}
