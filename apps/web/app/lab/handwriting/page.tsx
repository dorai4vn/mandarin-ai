'use client';
import { handwritingType } from '@mandarin/domain';
import type { HandwritingRecognitionResult } from '@mandarin/contracts';
import { useRef, useState } from 'react';
import { HandwritingCanvas, type HandwritingCanvasHandle } from '@/components/HandwritingCanvas';
import { StatusBadge } from '@/components/StatusBadge';
import { Button, Card, Mono, PageHeader } from '@/components/ui';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';
import { HanziText } from '@/components/Hanzi';

// M0 spike only: in M5 the prompt and the grading come from the server so the target is
// never present client-side before submission. Here it is only kept out of the DOM.
const PROMPT = { meaningVi: 'núi (ngọn núi)', target: String.fromCodePoint(0x5c71) };

export default function HandwritingLab() {
  const canvas = useRef<HandwritingCanvasHandle>(null);
  const [strokes, setStrokes] = useState(0);
  const [result, setResult] = useState<HandwritingRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const rec = canvas.current?.recorder();
    if (!rec || rec.completed().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api.recognizeHandwriting({
          strokes: rec.completed(),
          writingArea: canvas.current!.size(),
          pointerType: rec.pointerKind(),
          limit: 8,
        }),
      );
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const grade = result
    ? handwritingType.grade({ targetHanzi: PROMPT.target }, { candidates: result.candidates })
    : null;

  return (
    <>
      <PageHeader
        title="Viết chữ Hán"
        lead="Viết bằng ngón tay, chuột/trackpad hoặc bút. Nét viết được gửi tới máy chủ để nhận dạng (cần mạng)."
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div>
          <HandwritingCanvas ref={canvas} label="Khung viết chữ Hán" onChange={setStrokes} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => void submit()}
              disabled={busy || strokes === 0}
              data-testid="hw-submit"
            >
              {busy ? 'Đang nhận dạng…' : 'Nộp bài'}
            </Button>
            <Button variant="ghost" onClick={() => canvas.current?.undo()} disabled={strokes === 0}>
              Hoàn tác nét
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                canvas.current?.clear();
                setResult(null);
                setError(null);
              }}
            >
              Xóa
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Gợi ý">
            <p className="text-lg">
              Hãy viết chữ Hán có nghĩa: <strong>{PROMPT.meaningVi}</strong>
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Đáp án chỉ hiện sau khi nộp. Số nét đã viết: {strokes}
            </p>
          </Card>
          <StatusBadge label={labelForResult(result?.source ?? null, error)} />
          {result && grade && (
            <Card title="Kết quả">
              <p data-testid="hw-verdict" className="text-lg font-semibold">
                {grade.correct ? '✅ Đúng!' : '❌ Chưa đúng'} Đáp án:{' '}
                <HanziText className="text-3xl">{PROMPT.target}</HanziText>
              </p>
              <p className="mt-2 text-sm text-ink-2">
                Ứng viên (tốt nhất trước) — chỉ ứng viên đầu tiên được tính là đúng:
              </p>
              <ol data-testid="hw-candidates" className="mt-1 flex flex-wrap gap-2">
                {result.candidates.map((c, i) => (
                  <li
                    key={`${c.text}-${i}`}
                    lang="zh-Hans"
                    className={`hanzi rounded-lg border px-2 py-1 text-2xl ${i === 0 ? 'border-primary-base' : 'border-line'}`}
                  >
                    {c.text}
                  </li>
                ))}
              </ol>
              <Mono>{`adapter=${result.adapterId} source=${result.source} latency=${result.latencyMs}ms\nreason=${grade.reason}`}</Mono>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
