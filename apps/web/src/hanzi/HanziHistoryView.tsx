'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { HanziText } from '@/components/Hanzi';
import { Badge, Button } from '@/components/ui';
import { HANZI_HISTORY } from './data';
import { nextIndex, playableStages } from './model';
import type { HanziHistory as History } from './types';

const STEP_MS = 1800;
const FADE_MS = 600;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Interactive historical timeline (PRD-03). The animation only cross-fades between ATTESTED
 * stages; no intermediate glyph is generated or morphed. Missing stages are shown as gaps and are
 * skipped by playback. Stroke order is a separate feature (not here).
 */
export default function HanziHistoryView({ glyph }: { glyph: string }) {
  const history: History | undefined = HANZI_HISTORY[glyph];
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stages = history ? playableStages(history) : [];

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      const n = nextIndex(index, stages.length);
      if (n === null) setPlaying(false);
      else setIndex(n);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index, stages.length]);

  if (!history) return null;
  const all = history.stages;
  const active = stages[index]!;

  const select = (i: number) => {
    setPlaying(false);
    setIndex(i);
  };
  const replay = () => {
    setIndex(0);
    setPlaying(true);
  };
  const play = () => {
    if (index >= stages.length - 1) setIndex(0);
    setPlaying(true);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = stages.length - 1;
    const target =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(i + 1, last)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(i - 1, 0)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (target === null) return;
    e.preventDefault();
    select(target);
    tabs.current[target]?.focus();
  };

  return (
    <section
      aria-label={`Lịch sử chữ ${glyph}`}
      className="mt-5 border-t border-line pt-4"
      data-testid="hanzi-history"
      data-glyph={glyph}
    >
      <h3 className="mb-1 text-sm font-semibold text-fg-muted">
        Tiến hóa chữ <HanziText>{glyph}</HanziText> ({history.meaningVi})
      </h3>
      <p className="mb-3 text-xs text-fg-muted" data-testid="hanzi-history-disclaimer">
        Chỉ các giai đoạn có nguồn được hiển thị. Hoạt ảnh chỉ chuyển mờ giữa các hình đã được ghi
        nhận, không tạo hình trung gian.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="relative aspect-square w-full max-w-[220px] shrink-0 rounded-card bg-subtle"
          role="img"
          aria-label={`${active.label}: hình chữ ${glyph}`}
          data-testid="hanzi-history-stage"
          data-stage={active.id}
          data-playing={playing}
        >
          {stages.map((s, i) => (
            <div
              key={s.id}
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center p-3"
              data-testid={`hanzi-layer-${s.id}`}
              style={{
                opacity: i === index ? 1 : 0,
                transition: reduced ? 'none' : `opacity ${FADE_MS}ms ease-in-out`,
              }}
            >
              {s.status === 'attested' ? (
                <svg viewBox={s.svg.viewBox} className="h-full w-full" focusable="false">
                  <path d={s.svg.d} fill="currentColor" />
                </svg>
              ) : (
                <HanziText className="text-[9rem] leading-none">{glyph}</HanziText>
              )}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2" data-testid="hanzi-history-controls">
            <Button
              size="sm"
              onClick={playing ? () => setPlaying(false) : play}
              data-testid="hanzi-play"
              aria-pressed={playing}
            >
              {playing ? 'Tạm dừng' : 'Phát'}
            </Button>
            <Button size="sm" variant="secondary" onClick={replay} data-testid="hanzi-replay">
              Phát lại
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => select(Math.max(index - 1, 0))}
              disabled={index === 0}
              data-testid="hanzi-prev"
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => select(Math.min(index + 1, stages.length - 1))}
              disabled={index === stages.length - 1}
              data-testid="hanzi-next"
            >
              Sau
            </Button>
          </div>
          {reduced && (
            <p className="mb-2 text-xs text-fg-muted" data-testid="hanzi-reduced-note">
              Bạn đã bật giảm chuyển động: các giai đoạn đổi tức thì, không chuyển mờ.
            </p>
          )}

          <ol
            className="flex flex-col gap-1"
            data-testid="hanzi-timeline"
            aria-label="Dòng thời gian"
          >
            {all.map((s) => {
              const pi = stages.findIndex((x) => x.id === s.id);
              if (s.status === 'missing') {
                return (
                  <li
                    key={s.id}
                    className="rounded-control border border-dashed border-line px-3 py-2 text-sm text-fg-muted"
                    data-testid={`hanzi-stage-${s.id}`}
                    data-status="missing"
                  >
                    <span className="font-medium">{s.label}</span> · {s.period}{' '}
                    <Badge variant="warning">Chưa có tư liệu</Badge>
                    <p className="mt-1 text-xs">{s.missingReason}</p>
                  </li>
                );
              }
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    ref={(el) => {
                      tabs.current[pi] = el;
                    }}
                    onClick={() => select(pi)}
                    onKeyDown={(e) => onKey(e, pi)}
                    aria-current={pi === index ? 'step' : undefined}
                    data-testid={`hanzi-stage-${s.id}`}
                    data-status={s.status}
                    className={`w-full rounded-control border px-3 py-2 text-left text-sm ${
                      pi === index ? 'border-primary bg-primary-subtle' : 'border-line'
                    }`}
                  >
                    <span className="font-medium">{s.label}</span> · {s.period}{' '}
                    <Badge variant={s.status === 'attested' ? 'success' : 'neutral'}>
                      {s.status === 'attested' ? 'Có nguồn' : 'Chữ hiện đại'}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Giai đoạn hiện tại: {active.label}
      </p>

      <div
        className="mt-3 rounded-control bg-subtle p-3 text-sm"
        data-testid="hanzi-evidence"
        data-stage={active.id}
      >
        <h4 className="mb-1 font-semibold">Bằng chứng — {active.label}</h4>
        {active.status === 'attested' ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-fg-muted">Nguồn</dt>
            <dd>
              <a
                className="text-link underline"
                href={active.evidence.sourceUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                {active.evidence.sourceTitle}
              </a>
            </dd>
            <dt className="text-fg-muted">Giấy phép</dt>
            <dd>
              <a
                className="text-link underline"
                href={active.evidence.licenceUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                {active.evidence.licence}
              </a>
            </dd>
            <dt className="text-fg-muted">Tác giả bản vẽ</dt>
            <dd>{active.evidence.contributor}</dd>
            <dt className="text-fg-muted">Xuất xứ</dt>
            <dd>{active.evidence.provenance}</dd>
            <dt className="text-fg-muted">Truy cập</dt>
            <dd>{active.evidence.retrievedOn}</dd>
            <dt className="text-fg-muted">Duyệt</dt>
            <dd data-testid="hanzi-review-status">
              {active.evidence.reviewStatus === 'reviewed'
                ? 'Đã duyệt'
                : 'Chưa được chủ dự án duyệt'}
            </dd>
          </dl>
        ) : (
          <p className="text-xs">{active.status === 'modern' ? active.note : ''}</p>
        )}
      </div>

      {history.mnemonic && (
        <div
          className="mt-3 rounded-control border border-line p-3 text-sm"
          data-testid="hanzi-mnemonic"
        >
          <Badge variant="accent">Minh họa gợi nhớ — không phải bằng chứng</Badge>
          <p className="mt-1">{history.mnemonic.text}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-fg-muted" data-testid="hanzi-strokeorder-note">
        Thứ tự nét: chưa có trong bản này. {history.strokeOrder.note}
      </p>
    </section>
  );
}
