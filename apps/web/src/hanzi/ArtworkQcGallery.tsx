import { BEGINNER, activeChars, archiveChars } from './beginner200';

/**
 * Owner QC gallery: every active (246) and archive (4 with art) candidate image, in source order.
 * Images are UNAPPROVED candidates served from /mnemonic-candidates/ (never /mnemonic/); this
 * component grants no approval and changes no manifest status.
 */
export function ArtworkQcGallery() {
  const active = [...activeChars(BEGINNER)].sort(
    (a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0),
  );
  // Only the retained archive characters that already have a stored candidate are shown (4 of 40).
  const archive = archiveChars(BEGINNER).filter((c) => c.pilot);
  const items = [
    ...active.map((c) => ({ c, group: 'active' as const })),
    ...archive.map((c) => ({ c, group: 'archive' as const })),
  ];
  return (
    <section aria-labelledby="qc-gallery-title" data-testid="artwork-qc-gallery">
      <h2 id="qc-gallery-title" className="mb-2 text-xl font-semibold">
        Ảnh ứng viên HSK 3.0 Level 1 ({active.length} chữ) + {archive.length} lưu trữ
      </h2>
      <p className="mb-3 text-xs text-fg-muted" data-testid="artwork-qc-note">
        Ảnh ứng viên chưa duyệt — chỉ để chủ dự án QC. Kiểm tra kỹ thuật (SHA-256, WebP 1600×1200)
        đã đạt; chưa phải duyệt hình ảnh/sư phạm.
      </p>
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        data-testid="artwork-qc-grid"
      >
        {items.map(({ c, group }) => (
          <li
            key={c.id}
            className="min-w-0 overflow-hidden rounded-control border border-line text-sm"
            data-testid={`artwork-qc-${c.hanzi}`}
            data-group={group}
            data-status={c.artwork.status}
          >
            <div className="aspect-[4/3] w-full bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/mnemonic-candidates/${c.artwork.file}`}
                alt={`Ảnh ứng viên chưa duyệt cho ${c.hanzi}`}
                width={1600}
                height={1200}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="p-2">
              <span className="text-xl" lang="zh-Hans">
                {c.hanzi}
              </span>{' '}
              <span className="text-fg-muted">
                {c.pinyin} · {c.meaningVi}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
