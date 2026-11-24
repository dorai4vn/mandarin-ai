'use client';
import {
  PDF_UPLOAD_LIMITS,
  checkPdfSize,
  looksLikePdf,
  type PdfUploadResult,
} from '@mandarin/contracts';
import { useEffect, useState, type DragEvent } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, Mono, PageHeader } from '@/components/ui';
import { api, describeApiError } from '@/lib/api-client';
import { labelForResult } from '@/lib/status';

const MB = 1024 * 1024;
const bytes = (n: number) => `${n.toLocaleString('vi-VN')} byte`;
const formatMb = (n: number) =>
  `${(n / MB).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;

/**
 * Client-side checks mirror the server's (size + %PDF- signature); the server re-validates.
 * Only the first 5 bytes are read (`slice`) — a 50 MB file is never loaded into memory on the main
 * thread; the upload streams the File straight from disk (fetch with a Blob body).
 */
async function validate(file: File): Promise<string | null> {
  const size = checkPdfSize(file.size);
  if (size === 'empty') return 'Tệp rỗng.';
  if (size === 'too_large')
    return `Tệp "${file.name}" nặng ${formatMb(file.size)} (${bytes(file.size)}), vượt giới hạn ${PDF_UPLOAD_LIMITS.maxLabel} (${bytes(PDF_UPLOAD_LIMITS.maxBytes)}) mỗi tệp. Hãy chia nhỏ hoặc nén PDF rồi thử lại.`;
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  } catch {
    // The browser could not read the file (moved/deleted, cloud placeholder, permission).
    return `Không đọc được tệp "${file.name}". Hãy chọn lại tệp đã lưu trên máy.`;
  }
  if (!looksLikePdf(head)) return 'Tệp không phải PDF.';
  return null;
}

export default function UploadLab() {
  const [result, setResult] = useState<PdfUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  // A file chosen before React hydrates would be silently dropped (no onChange yet): keep the
  // picker disabled until the page is interactive (same pattern as the sign-in form, X1).
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);

  const handle = async (file: File | undefined) => {
    if (!file || busy) return;
    setResult(null);
    const problem = await validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    setSending(`${file.name} · ${formatMb(file.size)}`);
    try {
      setResult(await api.uploadPdf(file));
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
      setSending(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!ready) return;
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
          <span className="text-lg font-semibold">
            {!ready ? 'Đang tải…' : busy ? 'Đang tải lên…' : 'Chọn tệp PDF'}
          </span>
          <span className="hidden text-sm text-ink-2 md:block">hoặc kéo-thả tệp vào đây</span>
          <span className="text-sm text-ink-2" data-testid="pdf-limit">
            Tối đa {PDF_UPLOAD_LIMITS.maxLabel} mỗi tệp
          </span>
          {sending && (
            <span className="text-sm" aria-live="polite" data-testid="pdf-sending">
              Đang gửi {sending} — tệp lớn có thể mất vài phút trên mạng di động.
            </span>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={!ready || busy}
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
