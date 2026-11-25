'use client';
import type { PronunciationAssessmentResult } from '@mandarin/contracts';
import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Mono } from '@/components/ui';
import { Button, Card, PageHeader } from '@/components/ui/index';
import { MicIcon, PlayIcon, StopIcon } from '@/components/icons';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';
import {
  PcmRecorder,
  queryMicPermission,
  type MicPermission,
  type Recording,
} from '@/platform/audio-capture';
import { parseWavHeader, toBase64 } from '@/platform/wav';
import { HanziText, Pinyin } from '@/components/Hanzi';

const REFERENCE = '你好';
const RATES = [0.5, 0.75, 1] as const;
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function micHelp(): string {
  return 'Bấm biểu tượng ổ khóa/thông tin cạnh địa chỉ trang (Chrome, Edge, Firefox) hoặc “aA”/Cài đặt trang web (Safari) → cho phép Micro, rồi tải lại trang.';
}

export default function AudioLab() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<Recording | null>(null);
  const [assessment, setAssessment] = useState<PronunciationAssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(1);
  // Real elapsed time while recording (no simulated level meter: M0 has no analyser output).
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const recorder = useRef<PcmRecorder | null>(null);
  const audioUrl = useRef<string | null>(null);
  const audioEl = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Capability + permission state are read once from the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext);
    void queryMicPermission().then(setPermission);
    return () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  const start = async () => {
    setError(null);
    setAssessment(null);
    try {
      recorder.current = new PcmRecorder();
      await recorder.current.start();
      setPermission('granted');
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPermission('denied');
        setError('Quyền micro bị từ chối.');
      } else if (name === 'NotFoundError') setError('Không tìm thấy micro trên thiết bị.');
      else if (e instanceof Error && e.message === 'audio_context_suspended')
        setError('Trình duyệt đang chặn xử lý âm thanh. Hãy bấm “Bắt đầu ghi” lần nữa.');
      else setError(e instanceof Error ? e.message : String(e));
    }
  };

  const stop = async () => {
    if (!recorder.current) return;
    const rec = await recorder.current.stop();
    setRecording(false);
    setResult(rec);
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = URL.createObjectURL(
      new Blob([rec.wav.slice().buffer], { type: 'audio/wav' }),
    );
    if (audioEl.current) audioEl.current.src = audioUrl.current;
  };

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [recording]);

  const play = () => {
    if (!audioEl.current) return;
    audioEl.current.playbackRate = rate;
    void audioEl.current.play();
  };

  const assess = async () => {
    if (!result) return;
    setError(null);
    try {
      setAssessment(
        await api.assessPronunciation({
          referenceText: REFERENCE,
          locale: 'zh-CN',
          audioBase64: toBase64(result.wav),
        }),
      );
    } catch (e) {
      setError(describeApiError(e)); // the recording is kept (PRD-06)
    }
  };

  const header = result ? parseWavHeader(result.wav) : null;

  return (
    <>
      <PageHeader
        title="Micro & phát âm"
        lead={
          <>
            Đọc to câu mẫu: <HanziText>{REFERENCE}</HanziText> (<Pinyin>nǐ hǎo</Pinyin>). Âm thanh
            chỉ nằm trong bộ nhớ, không lưu vào thiết bị.
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Ghi âm">
          {supported === false ? (
            <p role="alert" data-testid="mic-unsupported">
              Trình duyệt/kết nối này không hỗ trợ ghi âm (cần HTTPS và trình duyệt hiện đại). Các
              tính năng khác vẫn dùng được.
            </p>
          ) : (
            <>
              <p className="text-sm text-fg-muted" data-testid="mic-permission">
                Quyền micro:{' '}
                {
                  {
                    unknown: 'chưa rõ (trình duyệt sẽ hỏi khi bạn bấm ghi)',
                    prompt: 'chưa cấp (trình duyệt sẽ hỏi khi bạn bấm ghi)',
                    granted: 'đã cho phép',
                    denied: 'bị từ chối',
                  }[permission]
                }
              </p>
              {permission === 'denied' && (
                <p className="mt-2 rounded-control bg-error-subtle p-3 text-sm text-error-strong">
                  {micHelp()}
                </p>
              )}
              {/* Recorder (V2 §22): 64 px round button, label follows the state. */}
              <div className="mt-4 flex items-center gap-4">
                <span className="relative inline-flex">
                  {recording && (
                    <span
                      aria-hidden
                      className="absolute -inset-1.5 rounded-full border-2 border-error-base/60 motion-safe:animate-pulse"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => void (recording ? stop() : start())}
                    data-testid={recording ? 'rec-stop' : 'rec-start'}
                    aria-label={recording ? 'Dừng ghi' : 'Bắt đầu ghi'}
                    className={`relative flex size-16 items-center justify-center rounded-full shadow-md ${recording ? 'bg-error text-on-error hover:bg-error-hover' : 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active'}`}
                  >
                    {recording ? (
                      <StopIcon width={28} height={28} />
                    ) : (
                      <MicIcon width={28} height={28} />
                    )}
                  </button>
                </span>
                <div aria-live="polite" className="min-w-0">
                  <p className="font-semibold text-fg">
                    {recording ? (
                      <>
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block size-2 rounded-full bg-error-base align-middle"
                        />
                        Đang ghi
                      </>
                    ) : result ? (
                      'Đã ghi'
                    ) : (
                      'Bấm để bắt đầu ghi'
                    )}
                  </p>
                  <p className="text-sm tabular-nums text-fg-muted" aria-hidden={recording}>
                    {recording ? fmt(elapsed) : result ? fmt(result.durationMs) : '0:00'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon={<PlayIcon width={20} height={20} />}
                  onClick={play}
                  disabled={!result || recording}
                >
                  Nghe lại
                </Button>
                <fieldset className="flex items-center gap-2">
                  <legend className="sr-only">Tốc độ nghe lại</legend>
                  <span aria-hidden className="text-sm text-fg-muted">
                    Tốc độ
                  </span>
                  <div className="inline-flex rounded-control bg-subtle p-1">
                    {RATES.map((r) => (
                      <label
                        key={r}
                        className="cursor-pointer rounded-[10px] px-3 py-1.5 text-sm font-medium text-fg-muted has-[:checked]:bg-surface has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]"
                      >
                        <input
                          type="radio"
                          name="playback-rate"
                          value={r}
                          checked={rate === r}
                          onChange={() => setRate(r)}
                          className="sr-only"
                        />
                        {r}×
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <audio ref={audioEl} className="hidden" />
              {result && header && (
                <div className="mt-4">
                  <Mono>
                    <span data-testid="wav-info">{`WAV ${header.sampleRate} Hz · ${header.channels} kênh · ${header.bitsPerSample}-bit · ${result.wav.length} bytes`}</span>
                    {`\nthời lượng ${result.durationMs} ms · đầu vào ${result.inputSampleRate} Hz · ${result.engine}`}
                  </Mono>
                </div>
              )}
            </>
          )}
        </Card>
        <Card title="Chấm phát âm (API → Azure)">
          <p className="mb-3 text-sm text-fg-muted">
            Gửi bản ghi tới máy chủ để chấm (cần mạng). Bản ghi vẫn được giữ nếu gửi lỗi.
          </p>
          <Button onClick={() => void assess()} disabled={!result} data-testid="assess">
            Gửi chấm điểm
          </Button>
          <div className="mt-3">
            <StatusBadge label={labelForResult(assessment?.source ?? null, error)} />
          </div>
          {assessment && (
            <div className="mt-3">
              <Mono>
                {`status=${assessment.recognitionStatus}\n`}
                {Object.entries(assessment.scores)
                  .map(([k, v]) => `${k}: ${v ?? 'không có (nhà cung cấp không trả về)'}`)
                  .join('\n')}
              </Mono>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
