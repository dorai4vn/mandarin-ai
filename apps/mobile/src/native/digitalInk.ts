import { MockDigitalInk, type DigitalInkPort } from '@mandarin/adapters';
import type { InkRecognitionRequest, InkRecognitionResult } from '@mandarin/contracts';
import { DigitalInkNative } from '../../modules/digital-ink';

export const ZH_INK_LANGUAGE_TAG = 'zh-Hani-CN';

/** Live ML Kit adapter (iOS dev build). */
class NativeDigitalInk implements DigitalInkPort {
  constructor(private readonly native: NonNullable<typeof DigitalInkNative>) {}
  async isAvailable() {
    return true;
  }
  async prepareModel(languageTag: string) {
    return (
      (await this.native.isModelDownloaded(languageTag)) || this.native.downloadModel(languageTag)
    );
  }
  async recognize(req: InkRecognitionRequest): Promise<InkRecognitionResult> {
    const res = await this.native.recognize(req.languageTag, req.strokes, req.writingArea ?? null);
    return { source: 'live', modelId: `mlkit:${res.modelId}`, candidates: res.candidates };
  }
}

/** Returns the live adapter when the native module is linked, else a labelled MOCK. */
export function getDigitalInk(): { port: DigitalInkPort; mode: 'live' | 'mock' } {
  return DigitalInkNative
    ? { port: new NativeDigitalInk(DigitalInkNative), mode: 'live' }
    : { port: new MockDigitalInk(), mode: 'mock' };
}
