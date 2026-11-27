'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { HanziText } from '@/components/Hanzi';
import { HANZI_HISTORY } from './data';
import { MnemonicCard } from './MnemonicCard';
import {
  clampIndex,
  missingStages,
  nextIndex,
  parallelGroups,
  playStartIndex,
  playableStages,
  stageProgress,
  uncertaintyText,
} from './model';
import type { HanziHistory as History, HistoryStage } from './types';

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
  if (!history || playableStages(history).length === 0) return null;
  // key resets selected stage / playback when the character changes.
  return <HistoryPanel key={glyph} glyph={glyph} history={history} />;
}

function HistoryPanel({ glyph, history }: { glyph: string; history: History }) {
  const reduced = usePrefersReducedMotion();
  const [rawIndex, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'quick' | 'explore'>('quick');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stages = playableStages(history);
  const index = clampIndex(rawIndex, stages.length);
  const atEnd = index >= stages.length - 1;

  // One timer per step; cleared on pause, unmount, stage or glyph change.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      const n = nextIndex(index, stages.length);
      if (n === null) setPlaying(false);
      else setIndex(n);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index, stages.length]);

  const groups = parallelGroups(history);
  const missing = missingStages(history);
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
    setIndex(playStartIndex(index, stages.length));
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

  const modeBtn = (m: 'quick' | 'explore', label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      data-testid={`hanzi-mode-${m}`}
      className={`rounded-control border px-3 py-1 text-sm ${
        mode === m ? 'border-primary bg-primary-subtle font-medium' : 'border-line'
      }`}
    >
      {label}
    </button>
  );

  const icon = 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-line';

  return (
    <section
      aria-label={`Lịch sử chữ ${glyph}`}
      className="mt-5 min-w-0 border-t border-line pt-4"
      data-testid="hanzi-history"
      data-glyph={glyph}
      data-mode={mode}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg-muted">
          <HanziText>{glyph}</HanziText> · {history.meaningVi}{' '}
          <span
            className="ml-1 rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium"
            data-testid="hanzi-review-indicator"
          >
            Chờ duyệt
          </span>
        </h3>
        <div role="group" aria-label="Chế độ xem" className="flex gap-2" data-testid="hanzi-modes">
          {modeBtn('quick', 'Xem nhanh')}
          {modeBtn('explore', 'Khám phá')}
        </div>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-2">
        <div
          className="relative aspect-square w-full max-w-[22rem] rounded-card bg-subtle"
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
              className="absolute inset-0 flex items-center justify-center p-6"
              data-testid={`hanzi-layer-${s.id}`}
              style={{
                opacity: i === index ? 1 : 0,
                transition: reduced ? 'none' : `opacity ${FADE_MS}ms ease-in-out`,
              }}
            >
              <StageGlyph stage={s} glyph={glyph} big />
            </div>
          ))}
        </div>
        <p className="text-sm" data-testid="hanzi-stage-caption">
          <span className="font-medium">{active.label}</span>
          {active.periodShort ? ` · ${active.periodShort}` : ''}
        </p>

        <div
          role="progressbar"
          aria-label="Tiến độ giai đoạn"
          aria-valuemin={1}
          aria-valuemax={stages.length}
          aria-valuenow={index + 1}
          aria-valuetext={`Giai đoạn ${index + 1}/${stages.length}${atEnd ? ' (cuối)' : ''}`}
          className="h-1 w-full max-w-[22rem] overflow-hidden rounded-full bg-subtle"
          data-testid="hanzi-progress"
          data-progress={stageProgress(index, stages.length)}
        >
          <div
            className="h-full bg-primary"
            style={{
              width: `${stageProgress(index, stages.length) * 100}%`,
              transition: reduced ? 'none' : `width ${FADE_MS}ms ease-in-out`,
            }}
          />
        </div>

        <div className="flex justify-center gap-2" data-testid="hanzi-history-controls">
          <button
            type="button"
            className={icon}
            onClick={() => select(Math.max(index - 1, 0))}
            disabled={index === 0}
            data-testid="hanzi-prev"
            aria-label="Giai đoạn trước"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className={`${icon} border-primary bg-primary text-on-primary`}
            onClick={playing ? () => setPlaying(false) : play}
            data-testid="hanzi-play"
            aria-pressed={playing}
            aria-label={playing ? 'Tạm dừng' : 'Phát'}
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
          </button>
          <button
            type="button"
            className={icon}
            onClick={replay}
            data-testid="hanzi-replay"
            aria-label="Phát lại"
          >
            <span aria-hidden="true">↻</span>
          </button>
          <button
            type="button"
            className={icon}
            onClick={() => select(Math.min(index + 1, stages.length - 1))}
            disabled={index === stages.length - 1}
            data-testid="hanzi-next"
            aria-label="Giai đoạn sau"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
        {reduced && (
          <p className="text-xs text-fg-muted" data-testid="hanzi-reduced-note">
            Giảm chuyển động: đổi tức thì, không chuyển mờ.
          </p>
        )}

        {/* Equal-geometry thumbnails: fixed width, fixed glyph box, fixed label row and date row. */}
        <ol
          className="flex w-full min-w-0 flex-wrap justify-center gap-2"
          data-testid="hanzi-timeline"
          aria-label="Dòng thời gian"
          data-count={stages.length}
        >
          {stages.map((s, pi) => (
            <li key={s.id}>
              <button
                type="button"
                ref={(el) => {
                  tabs.current[pi] = el;
                }}
                onClick={() => select(pi)}
                onKeyDown={(e) => onKey(e, pi)}
                aria-current={pi === index ? 'step' : undefined}
                aria-label={`${s.label}, ${s.periodShort ?? 'chưa rõ niên đại'}`}
                data-testid={`hanzi-stage-${s.id}`}
                data-status={s.status}
                className={`grid h-[6.5rem] w-[4.5rem] grid-rows-[3rem_1.25rem_1.25rem] justify-items-center rounded-control border p-1 text-center text-xs ${
                  pi === index ? 'border-primary bg-primary-subtle' : 'border-line'
                }`}
              >
                <span className="h-12 w-12" aria-hidden="true">
                  <StageGlyph stage={s} glyph={glyph} />
                </span>
                <span className="w-full truncate font-medium">{s.label.split(' (')[0]}</span>
                <span className="w-full truncate text-fg-muted">{s.periodShort ?? '—'}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Giai đoạn hiện tại: {active.label}
      </p>

      <p className="mt-2 text-xs text-fg-muted" data-testid="hanzi-uncertainty">
        {uncertaintyText(active)}
      </p>

      <div className="mt-2" data-testid="hanzi-mnemonic-wrap">
        <MnemonicCard glyph={glyph} />
      </div>

      <details
        className="mt-3 rounded-control bg-subtle p-3 text-sm"
        data-testid="hanzi-evidence"
        data-stage={active.id}
        open={mode === 'explore'}
        key={mode}
      >
        <summary className="cursor-pointer font-semibold">Bằng chứng — {active.label}</summary>
        {active.status === 'attested' ? (
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-fg-muted">Nguồn</dt>
            <dd className="break-words">
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
            <dd className="break-words">
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
            <dd className="break-words">{active.evidence.provenance}</dd>
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
          <p className="mt-2 text-xs">{active.status === 'modern' ? active.note : ''}</p>
        )}

        {mode === 'explore' && (
          <div className="mt-3 space-y-2 text-xs" data-testid="hanzi-explore-extra">
            <p data-testid="hanzi-variants">
              <span className="font-medium">Biến thể song song:</span>{' '}
              {groups.length === 0
                ? 'chưa có dữ liệu có nguồn; không suy đoán.'
                : groups
                    .map((g) => `${g.track} (${g.stages.map((x) => x.label).join(', ')})`)
                    .join('; ')}
            </p>
            <div data-testid="hanzi-missing">
              <p className="font-medium">Chưa có tư liệu:</p>
              <ul className="list-disc pl-5">
                {missing.map((m) => (
                  <li key={m.id} data-testid={`hanzi-missing-${m.id}`}>
                    {m.label}: {m.status === 'missing' ? m.missingReason : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div data-testid="hanzi-skipped">
              <p className="font-medium">Nguồn đã loại:</p>
              <ul className="list-disc pl-5">
                {history.skippedSources.map((k) => (
                  <li key={k.title}>
                    {k.title}: {k.reason}
                  </li>
                ))}
              </ul>
            </div>
            <p data-testid="hanzi-history-disclaimer">
              Hoạt ảnh chỉ chuyển mờ giữa các hình đã ghi nhận; không tạo hình trung gian.
            </p>
            <p data-testid="hanzi-strokeorder-note">
              Thứ tự nét: chưa có trong bản này. {history.strokeOrder.note}
            </p>
          </div>
        )}
      </details>
    </section>
  );
}

function StageGlyph({ stage, glyph, big }: { stage: HistoryStage; glyph: string; big?: boolean }) {
  if (stage.status === 'attested')
    return (
      <svg viewBox={stage.svg.viewBox} className="h-full w-full" focusable="false">
        <path d={stage.svg.d} fill="currentColor" />
      </svg>
    );
  return (
    <HanziText className={`${big ? 'text-[9rem]' : 'text-3xl'} leading-none`}>{glyph}</HanziText>
  );
}
