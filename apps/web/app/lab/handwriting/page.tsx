'use client';
import { handwritingType } from '@mandarin/domain';
import type { HandwritingRecognitionResult } from '@mandarin/contracts';
import { useRef, useState } from 'react';
import { HandwritingCanvas, type HandwritingCanvasHandle } from '@/components/HandwritingCanvas';
import { StatusBadge } from '@/components/StatusBadge';
import { Button, Card, Mono, PageHeader } from '@/components/ui';
import { SendIcon, TrashIcon, UndoIcon } from '@/components/icons';
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(16rem,1fr)]">
        <div>
          <HandwritingCanvas
            ref={canvas}
            label={`Khung viết chữ Hán — ${strokes} nét`}
            onChange={setStrokes}
          />
          {/* Toolbar (V2 §23): icon + label; the label is visually hidden on phones. */}
          <div
            role="toolbar"
            aria-label="Công cụ viết"
            className="mt-3 flex max-w-[360px] flex-wrap items-center gap-2 md:max-w-[420px] lg:max-w-[480px]"
          >
            <Button
              variant="secondary"
              icon={<UndoIcon width={20} height={20} />}
              onClick={() => canvas.current?.undo()}
              disabled={strokes === 0}
            >
              <span className="max-md:sr-only">Hoàn tác nét</span>
            </Button>
            <Button
              variant="secondary"
              icon={<TrashIcon width={20} height={20} />}
              onClick={() => {
                canvas.current?.clear();
                setResult(null);
                setError(null);
              }}
            >
              <span className="max-md:sr-only">Xóa</span>
            </Button>
            <Button
              className="ml-auto"
              icon={<SendIcon width={20} height={20} />}
              onClick={() => void submit()}
              loading={busy}
              disabled={strokes === 0}
              data-testid="hw-submit"
            >
              {busy ? 'Đang nhận dạng…' : 'Nộp bài'}
            </Button>
          </div>
          <p className="mt-2 text-sm text-fg-muted">
            Viết tay cần chuột, màn hình cảm ứng hoặc bút; các nút trên dùng được bằng bàn phím.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Gợi ý">
            <p className="text-lg">
              Hãy viết chữ Hán có nghĩa: <strong>{PROMPT.meaningVi}</strong>
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Đáp án chỉ hiện sau khi nộp. Số nét đã viết:{' '}
              <span className="tabular-nums">{strokes}</span>
            </p>
          </Card>
          <StatusBadge label={labelForResult(result?.source ?? null, error)} />
          {result && grade && (
            <Card title="Kết quả">
              <p data-testid="hw-verdict" className="text-lg font-semibold">
                <span className={grade.correct ? 'text-success-text' : 'text-error-text'}>
                  {grade.correct ? 'Đúng!' : 'Chưa đúng'}
                </span>{' '}
                · Đáp án: <HanziText className="text-3xl">{PROMPT.target}</HanziText>
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                Ứng viên (tốt nhất trước) — chỉ ứng viên đầu tiên được tính là đúng:
              </p>
              <ol data-testid="hw-candidates" className="mt-1 flex flex-wrap gap-2">
                {result.candidates.map((c, i) => (
                  <li
                    key={`${c.text}-${i}`}
                    lang="zh-Hans"
                    className={`hanzi flex size-12 items-center justify-center rounded-control border text-2xl ${i === 0 ? 'border-primary-base bg-primary-subtle' : 'border-line bg-surface'}`}
                  >
                    {c.text}
                  </li>
                ))}
              </ol>
              <div className="mt-3">
                <Mono>{`adapter=${result.adapterId} source=${result.source} latency=${result.latencyMs}ms\nreason=${grade.reason}`}</Mono>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
