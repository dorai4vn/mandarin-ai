'use client';
import { PDF_UPLOAD_LIMITS, looksLikePdf, type PdfUploadResult } from '@mandarin/contracts';
import { useState, type DragEvent } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, Mono, PageHeader } from '@/components/ui';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';

/** Client-side checks mirror the server's (size + %PDF- signature); the server re-validates. */
async function validate(file: File): Promise<string | null> {
  if (file.size === 0) return 'Tệp rỗng.';
  if (file.size > PDF_UPLOAD_LIMITS.maxBytes)
    return `Tệp lớn hơn ${PDF_UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB (giới hạn của bản M0).`;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (!looksLikePdf(head)) return 'Tệp không phải PDF.';
  return null;
}

export default function UploadLab() {
  const [result, setResult] = useState<PdfUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    const problem = await validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setResult(await api.uploadPdf(file));
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files[0]);
  };

  return (
    <>
      <PageHeader
        title="Tải PDF"
        lead="Chọn tệp (điện thoại: ứng dụng Tệp/Files) hoặc kéo-thả vào khung (máy tính). Tệp được lưu riêng tư."
      />
      <Card>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-testid="dropzone"
          className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center ${dragging ? 'border-seal bg-paper-2' : 'border-line'}`}
        >
          <span className="text-lg font-semibold">{busy ? 'Đang tải lên…' : 'Chọn tệp PDF'}</span>
          <span className="hidden text-sm text-ink-2 md:block">hoặc kéo-thả tệp vào đây</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            data-testid="pdf-input"
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <div className="mt-4">
          <StatusBadge label={labelForResult(result?.source ?? null, error)} />
        </div>
        {result && (
          <Mono>{`đường dẫn: ${result.storagePath}\nkích thước: ${result.sizeBytes} bytes\nsha256: ${result.sha256}`}</Mono>
        )}
      </Card>
    </>
  );
}
