'use client';
import {
  PDF_UPLOAD_LIMITS,
  checkPdfSize,
  looksLikePdf,
  type PdfUploadResult,
} from '@mandarin/contracts';
import { useEffect, useState, type DragEvent } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { useOffline } from '@/components/OfflineProvider';
import { FileIcon, UploadIcon } from '@/components/icons';
import { Mono } from '@/components/ui';
import { Badge, Card, PageHeader, ProgressBar, buttonClasses } from '@/components/ui/index';
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

type Phase = 'checking' | 'sending' | 'saved' | 'error';
const PHASE: Record<Phase, { text: string; variant: 'neutral' | 'primary' | 'success' | 'error' }> =
  {
    checking: { text: 'Đang kiểm tra', variant: 'neutral' },
    sending: { text: 'Đang tải', variant: 'primary' },
    saved: { text: 'Đã lưu', variant: 'success' },
    error: { text: 'Lỗi', variant: 'error' },
  };

/** File Upload V2 (COMPONENT_SPEC_V2 §21). M0 checks and flow unchanged. */
export default function UploadLab() {
  const { online } = useOffline();
  const [result, setResult] = useState<PdfUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number; phase: Phase } | null>(null);
  const [rejected, setRejected] = useState(false);
  // A file chosen before React hydrates would be silently dropped (no onChange yet): keep the
  // picker disabled until the page is interactive (same pattern as the sign-in form, X1).
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  const disabled = !ready || busy || !online;

  const handle = async (f: File | undefined) => {
    if (!f || busy) return;
    setResult(null);
    setRejected(false);
    setFile({ name: f.name, size: f.size, phase: 'checking' });
    const problem = await validate(f);
    if (problem) {
      setError(problem);
      setRejected(true);
      setFile({ name: f.name, size: f.size, phase: 'error' });
      return;
    }
    setError(null);
    setBusy(true);
    setFile({ name: f.name, size: f.size, phase: 'sending' });
    try {
      setResult(await api.uploadPdf(f));
      setFile({ name: f.name, size: f.size, phase: 'saved' });
    } catch (e) {
      setError(describeApiError(e));
      setFile({ name: f.name, size: f.size, phase: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    void handle(e.dataTransfer.files[0]);
  };

  const zone = dragging
    ? 'border-primary-base bg-primary-subtle'
    : rejected
      ? 'border-error-base bg-sunken'
      : 'border-line-strong bg-sunken';

  return (
    <>
      <PageHeader
        title="Tải PDF"
        lead="Chọn tệp (điện thoại: ứng dụng Tệp/Files) hoặc kéo-thả vào khung (máy tính). Tệp được lưu riêng tư."
      />
      <Card>
        {!online && (
          <p className="mb-4 text-sm text-fg-muted" data-testid="upload-offline">
            Đang offline — cần có mạng để tải tệp lên. Hãy thử lại khi có kết nối.
          </p>
        )}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-testid="dropzone"
          aria-disabled={disabled || undefined}
          className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-6 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--border-focus)] ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${zone}`}
        >
          <UploadIcon width={32} height={32} className="text-primary-base" />
          <span className="text-base text-fg">
            <span className="hidden md:inline">Kéo thả PDF vào đây hoặc </span>
            <span
              className={`${buttonClasses({ variant: 'primary', size: 'lg' })} mt-1 md:mt-0 md:inline-flex md:h-auto md:bg-transparent md:p-0 md:font-semibold md:text-link md:underline md:shadow-none max-md:w-full`}
            >
              {!ready ? 'Đang tải…' : busy ? 'Đang tải lên…' : 'Chọn tệp PDF'}
            </span>
          </span>
          <span className="text-sm text-fg-muted" data-testid="pdf-limit">
            Tối đa {PDF_UPLOAD_LIMITS.maxLabel} mỗi tệp
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={disabled}
            className="sr-only"
            data-testid="pdf-input"
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {file && (
          <div
            className="mt-4 flex items-start gap-3 rounded-control border border-line p-3"
            data-testid="upload-file"
            data-phase={file.phase}
          >
            <FileIcon width={24} height={24} className="mt-0.5 shrink-0 text-fg-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{file.name}</span>
                <Badge variant={PHASE[file.phase].variant}>{PHASE[file.phase].text}</Badge>
              </div>
              <span className="text-sm text-fg-muted tabular-nums">{formatMb(file.size)}</span>
              {file.phase === 'sending' && (
                <>
                  <ProgressBar label={`Đang tải ${file.name}`} thin className="mt-2" />
                  <span className="mt-1 block text-sm text-fg-muted" data-testid="pdf-sending">
                    Đang gửi {file.name} · {formatMb(file.size)} — tệp lớn có thể mất vài phút trên
                    mạng di động.
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <StatusBadge label={labelForResult(result?.source ?? null, error)} />
        </div>
        {result && (
          <div className="mt-3">
            <Mono>{`đường dẫn: ${result.storagePath}\nkích thước: ${result.sizeBytes} bytes\nsha256: ${result.sha256}`}</Mono>
          </div>
        )}
      </Card>
    </>
  );
}
