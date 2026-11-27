'use client';
import { useEffect, useState } from 'react';
import { MnemonicCard } from './MnemonicCard';
import { MNEMONICS, mnemonicSummary } from './mnemonic';

type ThemeChoice = 'system' | 'light' | 'dark';

/**
 * Preview-only theme control: sets data-theme on <html> using the existing design tokens and
 * restores the previous value on leave. It does NOT persist (the profile ThemePicker owns that).
 */
function useThemePreview(choice: ThemeChoice) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [choice]);
}

/** QC lab: all pilot mnemonic cards, independent of history data availability. */
export function MnemonicLab() {
  const [preview, setPreview] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('system');
  useThemePreview(theme);
  const s = mnemonicSummary();
  return (
    <div data-testid="mnemonic-lab">
      <p className="mb-3 text-sm" data-testid="mnemonic-lab-summary" role="status">
        {s.pending}/{s.total} ảnh đang chờ · {s.approved} đã duyệt · Trạng thái duyệt: chưa có ảnh
        nào được chủ dự án duyệt.
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
      <div
        role="group"
        aria-label="Xem trước giao diện"
        className="mb-3 flex flex-wrap gap-2"
        data-testid="mnemonic-theme-controls"
      >
        {(['system', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => setTheme(t)}
            data-testid={`mnemonic-theme-${t}`}
            className={`rounded-control border px-3 py-1 text-sm ${
              theme === t ? 'border-primary bg-primary-subtle font-medium' : 'border-line'
            }`}
          >
            {t === 'system' ? 'Theo hệ thống' : t === 'light' ? 'Sáng' : 'Tối'}
          </button>
        ))}
      </div>
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
              Tệp dự kiến: {m.assetFile} ·{' '}
              {m.status === 'pending-artwork' ? 'chờ tác phẩm' : 'đã duyệt'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
