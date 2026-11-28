'use client';

import { useState } from 'react';
import { CountingDiagram } from './CountingDiagram';
import { BEGINNER, activeChars, archiveChars } from './beginner200';
import {
  ACTION_LABEL,
  EST_COST_PER_IMAGE_USD,
  REMEDIATION,
  REMEDIATION_BY_HANZI,
  type RemediationAction,
} from './artworkRemediation';

type Filter = 'all' | 'pass' | 'review' | RemediationAction;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pass', label: 'PASS sơ bộ' },
  { id: 'review', label: 'Cần xử lý' },
  { id: 'contextual-card', label: 'Thẻ ngữ cảnh' },
  { id: 'counting-diagram', label: 'Sơ đồ đếm' },
  { id: 'contrast-card', label: 'Thẻ đối chiếu' },
  { id: 'retain-with-caption', label: 'Giữ kèm chú thích' },
];

/**
 * Owner QC gallery: every active (246) and archive (4 with art) candidate image, in source order.
 * Images are UNAPPROVED candidates served from /mnemonic-candidates/ (never /mnemonic/); this
 * component grants no approval and changes no manifest status.
 */
export function ArtworkQcGallery() {
  const [filter, setFilter] = useState<Filter>('all');
  const allActive = [...activeChars(BEGINNER)].sort(
    (a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0),
  );
  const count = (f: Filter) =>
    f === 'all'
      ? allActive.length
      : f === 'pass'
        ? allActive.length - REMEDIATION.length
        : f === 'review'
          ? REMEDIATION.length
          : REMEDIATION.filter((r) => r.action === f).length;
  const active = allActive.filter((c) => {
    const r = REMEDIATION_BY_HANZI.get(c.hanzi);
    if (filter === 'all') return true;
    if (filter === 'pass') return !r;
    if (filter === 'review') return !!r;
    return r?.action === filter;
  });
  const replaceN = count('replace-brief'); // 0: no image replacement is proposed any more
  // Only the retained archive characters that already have a stored candidate are shown (4 of 40).
  const archive = archiveChars(BEGINNER).filter((c) => c.pilot);
  type Item = (typeof active)[number];
  const card = (c: Item, group: 'active' | 'archive') => {
    const rem = group === 'active' ? REMEDIATION_BY_HANZI.get(c.hanzi) : undefined;
    const auditOnly = !!rem && rem.action !== 'retain-with-caption';
    return (
      <li
        key={c.id}
        className="flex min-w-0 flex-col overflow-hidden rounded-control border border-line text-sm"
        data-testid={`artwork-qc-${c.hanzi}`}
        data-group={group}
        data-status={c.artwork.status}
        data-audit={group === 'active' ? (rem ? rem.prelimVerdict : 'PASS') : undefined}
        data-remediation={rem?.action}
      >
        <div className="relative aspect-[4/3] w-full bg-surface-muted" data-testid="artwork-qc-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/mnemonic-candidates/${c.artwork.file}`}
            alt={`Ảnh ứng viên chưa duyệt cho ${c.hanzi}`}
            width={1600}
            height={1200}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            data-recommended={auditOnly ? 'false' : 'true'}
          />
          {auditOnly && (
            <span
              className="absolute inset-x-0 bottom-0 bg-surface px-2 py-1 text-xs font-semibold text-fg"
              data-testid="artwork-qc-audit-only"
            >
              Ảnh gốc chỉ để kiểm tra — không dùng để học
            </span>
          )}
        </div>
        <p className="min-h-[3.5rem] break-words p-2" data-testid="artwork-qc-caption">
          <span className="text-xl" lang="zh-Hans">
            {c.hanzi}
          </span>{' '}
          <span className="text-fg-muted">
            {c.pinyin} · {c.meaningVi}
          </span>
        </p>
        {rem && (
          <div
            className="mx-2 mb-2 space-y-1 rounded-control border border-line bg-surface-muted p-2 text-xs"
            data-testid="artwork-qc-remediation"
          >
            <p className="font-semibold" data-testid="artwork-qc-remediation-badge">
              {rem.prelimVerdict} sơ bộ · {ACTION_LABEL[rem.action]}
            </p>
            <p className="text-fg-muted">{rem.reasonVi}</p>
            {rem.diagram && <CountingDiagram spec={rem.diagram} hanzi={c.hanzi} />}
            {rem.card && (
              <div data-testid="artwork-qc-card">
                <p lang="zh-Hans" className="text-base">
                  {rem.card.zh}
                </p>
                <p>
                  {rem.card.pinyin} — {rem.card.vi}
                </p>
                <p className="text-fg-muted">{rem.card.noteVi}</p>
                {rem.card.more?.map((m) => (
                  <p key={m.zh} data-testid="artwork-qc-card-more">
                    <span lang="zh-Hans">{m.zh}</span> · {m.pinyin} — {m.vi}
                  </p>
                ))}
                {rem.card.contrast && (
                  <div className="mt-1 border-t border-line pt-1" data-testid="artwork-qc-contrast">
                    <p lang="zh-Hans" className="text-base">
                      {rem.card.contrast.zh}
                    </p>
                    <p>
                      {rem.card.contrast.pinyin} — {rem.card.contrast.vi}
                    </p>
                    <p className="text-fg-muted">{rem.card.contrast.label}</p>
                  </div>
                )}
              </div>
            )}
            {rem.captionVi && <p data-testid="artwork-qc-caption-note">{rem.captionVi}</p>}
            {rem.replacement && (
              <p className="text-fg-muted" data-testid="artwork-qc-replace-note">
                Đề xuất thay ảnh chưa thực hiện — cần chủ dự án duyệt trước khi tốn phí.
              </p>
            )}
          </div>
        )}
        <p
          className="mt-auto px-2 pb-2 text-xs font-semibold text-accent-text"
          data-testid="artwork-qc-badge"
        >
          Ứng viên · chưa duyệt
        </p>
      </li>
    );
  };
  const gridCls = 'grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4';
  return (
    <div data-testid="mnemonic-lab">
      <p className="mb-2 text-sm" data-testid="mnemonic-lab-summary" role="status">
        {allActive.length + archive.length}/{allActive.length + archive.length} ảnh ứng viên đang
        chờ duyệt · 0 đã duyệt · Trạng thái duyệt: chưa có ảnh nào được chủ dự án duyệt.
      </p>
      <p className="mb-3 text-xs font-semibold text-accent-text" data-testid="mnemonic-lab-notice">
        Gợi nhớ hiện đại — không phải bằng chứng lịch sử. Mọi ảnh dưới đây chỉ là trợ giúp ghi nhớ.
      </p>
      <div
        role="group"
        aria-label="Lọc theo trạng thái rà soát"
        className="mb-3 flex flex-wrap gap-2"
        data-testid="artwork-qc-filters"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            data-testid={`artwork-qc-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={`min-h-[44px] rounded-control border px-3 text-sm ${
              filter === f.id ? 'border-accent-text font-semibold' : 'border-line'
            }`}
          >
            {f.label} ({count(f.id)})
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-fg-muted" data-testid="artwork-qc-remediation-summary">
        Rà soát sơ bộ (chưa phải duyệt): {count('pass')} PASS sơ bộ · {REMEDIATION.length} cần xử lý
        ({count('contextual-card')} thẻ ngữ cảnh · {count('counting-diagram')} sơ đồ đếm SVG ·{' '}
        {count('contrast-card')} thẻ đối chiếu · {replaceN} đề xuất thay ảnh ≈ $
        {(replaceN * EST_COST_PER_IMAGE_USD).toFixed(4)} · {count('retain-with-caption')} giữ kèm
        chú thích). Ảnh gốc của các mục cần xử lý vẫn truy cập được để kiểm tra nhưng không phải
        hình học khuyến nghị; không ảnh nào bị xoá hay thay thế.
      </p>
      <section aria-labelledby="qc-gallery-title" data-testid="artwork-qc-gallery">
        <h2 id="qc-gallery-title" className="mb-2 text-xl font-semibold">
          HSK 3.0 Level 1 — {allActive.length} chữ đang học
          {filter === 'all' ? '' : ` (đang hiện ${active.length})`}
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
