import { describe, expect, it } from 'vitest';
import { buildKeyPragma, bytesToHex, isSqlCipherVersion } from './sqlcipher';
import { labelForResult } from './status';
import { StrokeRecorder, strokeToSvgPath } from './strokes';

describe('StrokeRecorder', () => {
  it('records relative timestamps and separate strokes for 山', () => {
    const r = new StrokeRecorder();
    // stroke 1: vertical middle
    r.begin(50, 10, 1000);
    r.move(50, 90, 1100);
    r.end();
    // stroke 2: left + bottom (one stroke)
    r.begin(20, 40, 1300);
    r.move(20, 90, 1350);
    r.move(80, 90, 1400);
    r.end();
    // stroke 3: right vertical
    r.begin(80, 40, 1500);
    r.move(80, 90, 1550);
    r.end();
    const s = r.completed();
    expect(s).toHaveLength(3);
    expect(s[0]!.points[0]).toEqual({ x: 50, y: 10, t: 0 });
    expect(s[2]!.points.at(-1)!.t).toBe(550);
  });

  it('drops near-duplicate points and keeps time monotonic', () => {
    const r = new StrokeRecorder(2);
    r.begin(0, 0, 10);
    r.move(0.5, 0.5, 20);
    r.move(5, 0, 5); // out-of-order timestamp
    r.end();
    expect(r.completed()[0]!.points).toEqual([
      { x: 0, y: 0, t: 0 },
      { x: 5, y: 0, t: 0 },
    ]);
  });

  it('ignores moves without begin and clears state', () => {
    const r = new StrokeRecorder();
    r.move(1, 1, 1);
    expect(r.snapshot()).toEqual([]);
    r.begin(1, 1, 1);
    expect(r.snapshot()).toHaveLength(1);
    r.clear();
    expect(r.snapshot()).toEqual([]);
  });

  it('renders an SVG path', () => {
    expect(
      strokeToSvgPath({
        points: [
          { x: 1, y: 2, t: 0 },
          { x: 3, y: 4, t: 1 },
        ],
      }),
    ).toBe('M1.0 2.0 L3.0 4.0');
  });
});

describe('SQLCipher helpers', () => {
  it('builds a raw-key pragma only for 64 hex chars', () => {
    const key = bytesToHex(new Uint8Array(32).fill(171));
    expect(key).toHaveLength(64);
    expect(buildKeyPragma(key)).toBe(`PRAGMA key = "x'${key}'";`);
    expect(() => buildKeyPragma(`${key.slice(0, 63)}'`)).toThrow();
    expect(() => buildKeyPragma('abc')).toThrow();
  });

  it('detects a SQLCipher version string', () => {
    expect(isSqlCipherVersion('4.17.0 community')).toBe(true);
    expect(isSqlCipherVersion('')).toBe(false);
    expect(isSqlCipherVersion(null)).toBe(false);
  });
});

describe('status labels', () => {
  it('never presents mock as live', () => {
    expect(labelForResult('mock').status).toBe('MOCKED');
    expect(labelForResult('live').status).toBe('LIVE_UNCONFIRMED');
    expect(labelForResult(null, 'thiếu module').status).toBe('BLOCKED');
  });
});
