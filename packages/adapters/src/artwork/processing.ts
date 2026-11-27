import { sha256Hex } from './mock-provider.js';
import type { ArtworkMetadata, ProviderImage } from './types.js';

export const MOCK_ENCODER = 'mock-webp-container-v1';
export const TARGET_WIDTH = 1024;
export const TARGET_HEIGHT = 768; // 4:3

function u32(n: number): number[] {
  return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
}
function u24(n: number): number[] {
  return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
}
const tag = (s: string) => [...s].map((c) => c.charCodeAt(0));

/**
 * Mock processor. Emits a structurally valid RIFF/WEBP container (VP8X header with a
 * 4:3 canvas) that carries the placeholder payload in a custom "MOCK" chunk.
 * It is NOT a decodable raster image. A real encoder (e.g. sharp/libwebp) needs a
 * dependency approval and replaces this behind the same `processImage` signature.
 */
export function processImage(img: ProviderImage): { bytes: Uint8Array; metadata: ArtworkMetadata } {
  const payload = img.bytes;
  const pad = payload.length % 2;
  const vp8x = [0x10, 0, 0, 0, ...u24(TARGET_WIDTH - 1), ...u24(TARGET_HEIGHT - 1)];
  const body = [
    ...tag('WEBP'),
    ...tag('VP8X'),
    ...u32(vp8x.length),
    ...vp8x,
    ...tag('MOCK'),
    ...u32(payload.length),
  ];
  const total = 8 + body.length + payload.length + pad;
  const out = new Uint8Array(total);
  out.set([...tag('RIFF'), ...u32(total - 8), ...body], 0);
  out.set(payload, 8 + body.length);
  return {
    bytes: out,
    metadata: {
      format: 'webp',
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      bytes: out.length,
      sha256: sha256Hex(out),
      encoder: MOCK_ENCODER,
    },
  };
}

/** Reads canvas size back from the container header (used by QC). */
export function readWebpHeader(
  bytes: Uint8Array,
): { width: number; height: number; mock: boolean } | null {
  if (bytes.length < 30) return null;
  const s = (o: number, n: number) => String.fromCharCode(...bytes.slice(o, o + n));
  if (s(0, 4) !== 'RIFF' || s(8, 4) !== 'WEBP' || s(12, 4) !== 'VP8X') return null;
  const r24 = (o: number) =>
    (bytes[o] ?? 0) | ((bytes[o + 1] ?? 0) << 8) | ((bytes[o + 2] ?? 0) << 16);
  return { width: r24(24) + 1, height: r24(27) + 1, mock: s(30, 4) === 'MOCK' };
}
