'use client';
import { concatFloat32, downsample, encodeWav, TARGET_SAMPLE_RATE } from './wav';

export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** Permission state where the Permissions API supports `microphone` (not every browser does). */
export async function queryMicPermission(): Promise<MicPermission> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return (status?.state as MicPermission | undefined) ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface Recording {
  wav: Uint8Array;
  durationMs: number;
  inputSampleRate: number;
  engine: 'audio-worklet' | 'script-processor';
}

/**
 * Captures mono PCM with Web Audio and encodes a 16 kHz WAV (D-023). Uses AudioWorklet when
 * available; falls back to ScriptProcessorNode (deprecated but widely supported) otherwise.
 * Audio stays in memory — nothing is written to device storage (D-022).
 */
export class PcmRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private chunks: Float32Array[] = [];
  private cleanup: (() => void) | null = null;
  private started = 0;
  engine: Recording['engine'] = 'audio-worklet';

  async start(): Promise<void> {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    await this.ctx.resume();
    const source = this.ctx.createMediaStreamSource(this.stream);
    if (this.ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      this.engine = 'audio-worklet';
      await this.ctx.audioWorklet.addModule('/worklets/pcm-recorder.js');
      const node = new AudioWorkletNode(this.ctx, 'pcm-recorder');
      node.port.onmessage = (e: MessageEvent<Float32Array>) => this.chunks.push(e.data);
      source.connect(node);
      this.cleanup = () => {
        node.port.onmessage = null;
        source.disconnect();
        node.disconnect();
      };
    } else {
      this.engine = 'script-processor';
      const node = this.ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) =>
        this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(this.ctx.destination);
      this.cleanup = () => {
        node.onaudioprocess = null;
        source.disconnect();
        node.disconnect();
      };
    }
    this.started = performance.now();
  }

  async stop(): Promise<Recording> {
    const rate = this.ctx?.sampleRate ?? TARGET_SAMPLE_RATE;
    this.cleanup?.();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();
    const pcm = downsample(concatFloat32(this.chunks), rate);
    this.chunks = [];
    return {
      wav: encodeWav(pcm),
      durationMs: Math.round(performance.now() - this.started),
      inputSampleRate: rate,
      engine: this.engine,
    };
  }
}
