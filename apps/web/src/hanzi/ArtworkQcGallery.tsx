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
  type Item = (typeof active)[number];
  const card = (c: Item, group: 'active' | 'archive') => (
    <li
      key={c.id}
      className="flex min-w-0 flex-col overflow-hidden rounded-control border border-line text-sm"
      data-testid={`artwork-qc-${c.hanzi}`}
      data-group={group}
      data-status={c.artwork.status}
    >
      <div className="aspect-[4/3] w-full bg-surface-muted" data-testid="artwork-qc-art">
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
      <p className="min-h-[3.5rem] break-words p-2" data-testid="artwork-qc-caption">
        <span className="text-xl" lang="zh-Hans">
          {c.hanzi}
        </span>{' '}
        <span className="text-fg-muted">
          {c.pinyin} · {c.meaningVi}
        </span>
      </p>
      <p
        className="mt-auto px-2 pb-2 text-xs font-semibold text-accent-text"
        data-testid="artwork-qc-badge"
      >
        Ứng viên · chưa duyệt
      </p>
    </li>
  );
  const gridCls = 'grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4';
  return (
    <div data-testid="mnemonic-lab">
      <p className="mb-2 text-sm" data-testid="mnemonic-lab-summary" role="status">
        {active.length + archive.length}/{active.length + archive.length} ảnh ứng viên đang chờ
        duyệt · 0 đã duyệt · Trạng thái duyệt: chưa có ảnh nào được chủ dự án duyệt.
      </p>
      <p className="mb-3 text-xs font-semibold text-accent-text" data-testid="mnemonic-lab-notice">
        Gợi nhớ hiện đại — không phải bằng chứng lịch sử. Mọi ảnh dưới đây chỉ là trợ giúp ghi nhớ.
      </p>
      <section aria-labelledby="qc-gallery-title" data-testid="artwork-qc-gallery">
        <h2 id="qc-gallery-title" className="mb-2 text-xl font-semibold">
          HSK 3.0 Level 1 — {active.length} chữ đang học
        </h2>
        <p className="mb-3 text-xs text-fg-muted" data-testid="artwork-qc-note">
          Ảnh ứng viên chưa duyệt — chỉ để chủ dự án QC. Kiểm tra kỹ thuật (SHA-256, WebP 1600×1200)
          đã đạt; chưa phải duyệt hình ảnh/sư phạm.
        </p>
        <ul className={gridCls} data-testid="artwork-qc-grid" aria-label="Ảnh ứng viên đang học">
          {active.map((c) => card(c, 'active'))}
        </ul>
      </section>
      <section
        aria-labelledby="qc-archive-title"
        className="mt-10"
        data-testid="artwork-qc-archive"
      >
        <h2 id="qc-archive-title" className="mb-2 text-xl font-semibold">
          Lưu trữ / mở rộng — {archive.length} chữ (tách riêng, không thuộc 246 chữ đang học)
        </h2>
        <ul
          className={gridCls}
          data-testid="artwork-qc-archive-grid"
          aria-label="Ảnh ứng viên lưu trữ"
        >
          {archive.map((c) => card(c, 'archive'))}
        </ul>
      </section>
    </div>
  );
}
