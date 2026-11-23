import { describe, expect, it } from 'vitest';
import { detectCapabilities, missingCore, recorderMimeTypes, type DetectEnv } from './capabilities';

const modern: DetectEnv = {
  isSecureContext: true,
  PointerEvent: class {},
  navigator: {
    mediaDevices: { getUserMedia: () => undefined },
    serviceWorker: {},
    storage: { persist: () => undefined },
  },
  AudioWorkletNode: class {},
  MediaRecorder: { isTypeSupported: (t: string) => t.startsWith('audio/mp4') },
  indexedDB: {},
  caches: {},
  PushManager: class {},
  Notification: class {},
  File: class {},
  FileReader: class {},
  RTCPeerConnection: class {},
  matchMedia: () => ({ matches: false }),
};

const byId = (env: DetectEnv) => Object.fromEntries(detectCapabilities(env).map((c) => [c.id, c]));

describe('capability detection', () => {
  it('reports a modern secure browser as fully capable for core features', () => {
    expect(missingCore(detectCapabilities(modern))).toEqual([]);
    expect(byId(modern).installedMode?.state).toBe('unsupported');
  });

  it('requires HTTPS for microphone and service worker', () => {
    const caps = byId({ ...modern, isSecureContext: false });
    expect(caps.microphone?.state).toBe('unsupported');
    expect(caps.microphone?.note).toMatch(/HTTPS/);
    expect(caps.serviceWorker?.state).toBe('unsupported');
  });

  it('treats missing IndexedDB/push as enhancements, not blockers', () => {
    const env: DetectEnv = { ...modern, indexedDB: undefined, PushManager: undefined };
    expect(missingCore(detectCapabilities(env))).toEqual([]);
    expect(byId(env).indexedDb?.state).toBe('unsupported');
    expect(byId(env).webPush?.kind).toBe('enhancement');
  });

  it('flags missing pointer events and file API as core gaps', () => {
    const gaps = missingCore(
      detectCapabilities({ ...modern, PointerEvent: undefined, File: undefined }),
    );
    expect(gaps.map((g) => g.id).sort()).toEqual(['fileUpload', 'pointerEvents']);
  });

  it('lists recorder MIME types without throwing', () => {
    expect(recorderMimeTypes(modern)).toEqual(['audio/mp4']);
    expect(
      recorderMimeTypes({
        MediaRecorder: {
          isTypeSupported: () => {
            throw new Error('x');
          },
        },
      }),
    ).toEqual([]);
    expect(recorderMimeTypes({})).toEqual([]);
  });

  it('detects installed (standalone) mode', () => {
    expect(
      byId({ ...modern, matchMedia: (q) => ({ matches: q.includes('standalone') }) }).installedMode
        ?.state,
    ).toBe('supported');
  });
});
