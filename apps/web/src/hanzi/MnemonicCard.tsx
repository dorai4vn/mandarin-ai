'use client';
import { useState } from 'react';
import { candidateSrc, findMnemonic, isSafeMnemonicSrc } from './mnemonic';

/**
 * Modern memory aid (NOT historical evidence), kept visually and semantically separate from the
 * history timeline. Renders a 4:3 artwork slot; with no approved image it shows a text-only
 * fallback and says the artwork is pending. Never draws substitute clipart.
 *
 * `preview` (owner review only): tries the separate /mnemonic-candidates/ path and labels the result
 * as an unapproved candidate. It never changes manifest status or grants approval.
 */
export function MnemonicCard({
  glyph,
  preview = false,
  showNotice = true,
}: {
  glyph: string;
  preview?: boolean;
  /** Lab grids show the "not historical evidence" notice once in the page header instead. */
  showNotice?: boolean;
}) {
  const m = findMnemonic(glyph);
  // Track the src that failed (not a boolean) so the state resets automatically on glyph/mode change.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  if (!m) return null;

  const approved =
    m.image && m.status === 'artwork-approved' && isSafeMnemonicSrc(m.image.src) ? m.image : null;
  const src = preview ? candidateSrc(m) : (approved?.src ?? null);
  const failed = src !== null && brokenSrc === src;
  const showImg = src !== null && !failed;
  const alt = preview ? `Ảnh ứng viên chưa duyệt cho ${m.glyph}` : (approved?.alt ?? '');

  let slotText = 'Ảnh minh họa đang chờ bổ sung.';
  if (failed)
    slotText = preview
      ? 'Chưa có file ảnh ứng viên.'
      : 'Không tải được ảnh minh họa (lỗi tải, không phải thiếu nguồn).';

  let provenance: string;
  if (preview)
    provenance = 'ỨNG VIÊN — chưa được chủ dự án duyệt; chưa có nguồn/giấy phép được xác minh.';
  else if (approved && !failed)
    provenance = `Tác giả: ${approved.author} · ${approved.licence} · ${approved.provenance}`;
  else if (approved)
    provenance = `Nguồn: ${approved.author} · ${approved.licence} · ${approved.provenance}`;
  else provenance = 'Chưa có tác phẩm được duyệt; chưa có nguồn/giấy phép ảnh.';

  return (
    <aside
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-control border border-line text-sm"
      data-testid="hanzi-mnemonic"
      data-art-state={
        preview ? 'preview' : approved ? (failed ? 'load-failed' : 'approved') : 'pending'
      }
      aria-label="Minh họa gợi nhớ"
    >
      <div
        className="aspect-[4/3] w-full shrink-0 bg-surface-muted"
        data-testid="mnemonic-art-slot"
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={alt}
            width={1600}
            height={1200}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setBrokenSrc(src)}
          />
        ) : (
          <p
            className="flex h-full items-center justify-center p-4 text-center text-fg-muted"
            data-testid="mnemonic-art-pending"
          >
            {slotText}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        {showNotice && (
          <p className="text-xs font-semibold text-accent-text" data-testid="mnemonic-notice">
            Gợi nhớ hiện đại — không phải bằng chứng lịch sử
          </p>
        )}
        {/* Cue slot reserves two lines (never clipped: it grows if a cue is longer). */}
        <p className="min-h-[3em] break-words" data-testid="mnemonic-cue">
          {m.cueVi}
        </p>
        <p
          className="mt-auto break-words pt-1 text-xs text-fg-muted"
          data-testid="mnemonic-provenance"
        >
          {provenance}
        </p>
      </div>
    </aside>
  );
}
