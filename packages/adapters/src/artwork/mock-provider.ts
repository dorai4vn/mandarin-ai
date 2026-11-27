import { createHash } from 'node:crypto';
import {
  ProviderError,
  type ArtworkProvider,
  type ArtworkRequest,
  type ProviderImage,
} from './types.js';

export const MOCK_LABEL = 'MOCK ARTWORK - placeholder, not a real illustration';

export function sha256Hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Deterministic SVG placeholder: same request => identical bytes. Costs nothing. */
export class MockArtworkProvider implements ArtworkProvider {
  readonly id = 'mock-artwork-v1';
  readonly kind = 'mock' as const;
  /** Test hook: fail the first N calls per subject. */
  private readonly failures = new Map<string, number>();

  failTimes(subjectId: string, times: number): void {
    this.failures.set(subjectId, times);
  }

  estimateCost(): number {
    return 0;
  }

  async generate(req: ArtworkRequest, opts: { signal: AbortSignal }): Promise<ProviderImage> {
    if (opts.signal.aborted) throw new ProviderError('aborted', false);
    const left = this.failures.get(req.subjectId) ?? 0;
    if (left > 0) {
      this.failures.set(req.subjectId, left - 1);
      throw new ProviderError('mock transient failure', true);
    }
    const h = sha256Hex(`${req.subjectId}|${req.prompt}|${req.style}|${req.seed}`);
    const hue = parseInt(h.slice(0, 4), 16) % 360;
    const esc = (s: string) => s.replace(/[<>&"']/g, '');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">` +
      `<rect width="1024" height="768" fill="hsl(${hue},40%,85%)"/>` +
      `<text x="512" y="360" text-anchor="middle" font-size="40">${MOCK_LABEL}</text>` +
      `<text x="512" y="420" text-anchor="middle" font-size="28">${esc(req.subjectId)}</text></svg>`;
    return {
      bytes: new TextEncoder().encode(svg),
      mimeType: 'image/svg+xml',
      width: 1024,
      height: 768,
      costUnits: 0,
    };
  }
}
