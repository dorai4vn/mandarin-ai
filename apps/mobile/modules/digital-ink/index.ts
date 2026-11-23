import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativeInkCandidate {
  text: string;
  score: number | null;
}

export interface DigitalInkNativeModule {
  isModelDownloaded(languageTag: string): Promise<boolean>;
  downloadModel(languageTag: string): Promise<boolean>;
  recognize(
    languageTag: string,
    strokes: { points: { x: number; y: number; t: number }[] }[],
    writingArea: { width: number; height: number } | null,
  ): Promise<{ candidates: NativeInkCandidate[]; modelId: string }>;
}

/**
 * Null when the native module is not linked (Expo Go, web, Android before its gate,
 * or a build made before this module existed). Callers must then fall back to a
 * clearly labelled MOCK adapter.
 */
export const DigitalInkNative = requireOptionalNativeModule<DigitalInkNativeModule>('DigitalInk');
