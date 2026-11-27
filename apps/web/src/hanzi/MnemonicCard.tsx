'use client';
import { useState } from 'react';
import { Badge } from '@/components/ui';
import { findMnemonic } from './mnemonic';

/**
 * Modern memory aid (NOT historical evidence), kept visually and semantically separate from the
 * history timeline. Renders a 4:3 artwork slot; with no approved image it shows a text-only
 * fallback and says the artwork is pending. Never draws substitute clipart.
 */
export function MnemonicCard({ glyph }: { glyph: string }) {
  const m = findMnemonic(glyph);
  const [broken, setBroken] = useState(false);
  if (!m) return null;
  const img = m.image && m.status === 'artwork-approved' && !broken ? m.image : null;
  return (
    <aside
      className="mt-3 overflow-hidden rounded-control border border-line text-sm"
      data-testid="hanzi-mnemonic"
      aria-label="Minh họa gợi nhớ"
    >
      <div className="aspect-[4/3] w-full bg-surface-muted" data-testid="mnemonic-art-slot">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <p
            className="flex h-full items-center justify-center p-4 text-center text-fg-muted"
            data-testid="mnemonic-art-pending"
          >
            {broken ? 'Không tải được ảnh minh họa.' : 'Ảnh minh họa đang chờ bổ sung.'}
          </p>
        )}
      </div>
      <div className="p-3">
        <Badge variant="accent">Minh họa gợi nhớ hiện đại — không phải bằng chứng lịch sử</Badge>
        <p className="mt-1" data-testid="mnemonic-cue">
          {m.cueVi}
        </p>
        <p className="mt-1 text-xs text-fg-muted" data-testid="mnemonic-provenance">
          {img
            ? `Tác giả: ${img.author} · ${img.licence} · ${img.provenance}`
            : 'Chưa có tác phẩm được duyệt; chưa có nguồn/giấy phép ảnh.'}
        </p>
      </div>
    </aside>
  );
}
