'use client';
import type { PronunciationAssessmentResult } from '@mandarin/contracts';
import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button, Card, Mono, PageHeader } from '@/components/ui';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';
import {
  PcmRecorder,
  queryMicPermission,
  type MicPermission,
  type Recording,
} from '@/platform/audio-capture';
import { parseWavHeader, toBase64 } from '@/platform/wav';

const REFERENCE = '你好';

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
  const [rate, setRate] = useState(1);
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
      setRecording(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPermission('denied');
        setError('Quyền micro bị từ chối.');
      } else if (name === 'NotFoundError') setError('Không tìm thấy micro trên thiết bị.');
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
        lead={`Đọc to câu mẫu: ${REFERENCE} (nǐ hǎo). Âm thanh chỉ nằm trong bộ nhớ, không lưu vào thiết bị.`}
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
              <p className="text-sm text-ink-2" data-testid="mic-permission">
                Quyền micro:{' '}
                {permission === 'unknown'
                  ? 'chưa rõ (trình duyệt sẽ hỏi khi bạn bấm ghi)'
                  : permission}
              </p>
              {permission === 'denied' && <p className="mt-2 text-sm">{micHelp()}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {!recording ? (
                  <Button onClick={() => void start()} data-testid="rec-start">
                    Bắt đầu ghi
                  </Button>
                ) : (
                  <Button onClick={() => void stop()} data-testid="rec-stop">
                    Dừng
                  </Button>
                )}
                <Button variant="ghost" onClick={play} disabled={!result}>
                  Nghe lại
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  Tốc độ
                  <select
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="rounded border border-line bg-paper px-2 py-1"
                  >
                    <option value={1}>1×</option>
                    <option value={0.75}>0.75×</option>
                    <option value={0.5}>0.5×</option>
                  </select>
                </label>
              </div>
              <audio ref={audioEl} className="hidden" />
              {result && header && (
                <Mono>
                  <span data-testid="wav-info">{`WAV ${header.sampleRate} Hz · ${header.channels} kênh · ${header.bitsPerSample}-bit · ${result.wav.length} bytes`}</span>
                  {`\nthời lượng ${result.durationMs} ms · đầu vào ${result.inputSampleRate} Hz · ${result.engine}`}
                </Mono>
              )}
            </>
          )}
        </Card>
        <Card title="Chấm phát âm (API → Azure)">
          <Button onClick={() => void assess()} disabled={!result} data-testid="assess">
            Gửi chấm điểm
          </Button>
          <div className="mt-3">
            <StatusBadge label={labelForResult(assessment?.source ?? null, error)} />
          </div>
          {assessment && (
            <Mono>
              {`status=${assessment.recognitionStatus}\n`}
              {Object.entries(assessment.scores)
                .map(([k, v]) => `${k}: ${v ?? 'không có (nhà cung cấp không trả về)'}`)
                .join('\n')}
            </Mono>
          )}
        </Card>
      </div>
    </>
  );
}
