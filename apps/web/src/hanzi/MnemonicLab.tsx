'use client';
import { useState } from 'react';
import { MnemonicCard } from './MnemonicCard';
import { MNEMONICS, mnemonicSummary } from './mnemonic';

/** QC lab: all pilot mnemonic cards, independent of history data availability. */
export function MnemonicLab() {
  const [preview, setPreview] = useState(false);
  const s = mnemonicSummary();
  return (
    <div data-testid="mnemonic-lab">
      <p className="mb-3 text-sm" data-testid="mnemonic-lab-summary" role="status">
        {s.pending}/{s.total} ảnh đang chờ · {s.approved} đã duyệt · Trạng thái duyệt: chưa có ảnh nào
        được chủ dự án duyệt.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
          data-testid="mnemonic-preview-toggle"
        />
        Xem trước ảnh ứng viên (chưa duyệt, chỉ để chủ dự án xem xét)
      </label>
      <nav aria-label="Chọn chữ" className="mb-4 flex flex-wrap gap-2">
        {MNEMONICS.map((m) => (
          <a
            key={m.glyph}
            href={`#mnemonic-${m.assetFile.replace('.webp', '')}`}
            className="rounded-control border border-line px-2 py-1 text-lg"
            data-testid={`mnemonic-nav-${m.glyph}`}
          >
            {m.glyph}
          </a>
        ))}
      </nav>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Thẻ gợi nhớ">
        {MNEMONICS.map((m) => (
          <li
            key={m.glyph}
            id={`mnemonic-${m.assetFile.replace('.webp', '')}`}
            data-testid={`mnemonic-lab-card-${m.glyph}`}
            data-status={m.status}
          >
            <h2 className="mb-1 text-3xl" lang="zh-Hant">
              {m.glyph}
              {m.aliases.length > 0 && (
                <span className="ml-2 text-base text-fg-muted" lang="zh-Hans">
                  ({m.aliases.join(', ')})
                </span>
              )}
            </h2>
            <MnemonicCard glyph={m.glyph} preview={preview} />
            <p className="mt-1 text-xs text-fg-muted">
              Tệp dự kiến: {m.assetFile} · {m.status === 'pending-artwork' ? 'chờ tác phẩm' : 'đã duyệt'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
