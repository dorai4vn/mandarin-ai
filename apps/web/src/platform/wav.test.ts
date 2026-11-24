import { describe, expect, it } from 'vitest';
import { concatFloat32, downsample, encodeWav, parseWavHeader, toBase64 } from './wav';

describe('WAV pipeline (D-023)', () => {
  it('downsamples 48 kHz to 16 kHz by averaging', () => {
    const input = Float32Array.from({ length: 48000 }, (_, i) => (i % 3 === 0 ? 0.3 : 0));
    const out = downsample(input, 48000);
    expect(out.length).toBe(16000);
    expect(out[0]).toBeCloseTo(0.1, 5);
  });

  it('handles 44.1 kHz and rejects upsampling', () => {
    expect(downsample(new Float32Array(44100), 44100).length).toBe(16000);
    expect(() => downsample(new Float32Array(10), 8000)).toThrow();
  });

  it('encodes a valid 16 kHz mono 16-bit WAV with clipping', () => {
    const wav = encodeWav(Float32Array.from([0, 1, -1, 2, -2]));
    expect(parseWavHeader(wav)).toEqual({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      dataBytes: 10,
    });
    const view = new DataView(wav.buffer);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });

  it('concatenates chunks and base64-encodes large buffers', () => {
    expect(Array.from(concatFloat32([Float32Array.from([1]), Float32Array.from([2, 3])]))).toEqual([
      1, 2, 3,
    ]);
    const big = new Uint8Array(100_000).fill(65);
    expect(toBase64(big).startsWith('QUFB')).toBe(true);
    expect(parseWavHeader(new Uint8Array(10))).toBeNull();
  });
});
