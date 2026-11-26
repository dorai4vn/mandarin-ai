'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { hasHanziHistory } from './glyphs';

/**
 * Reusable lesson/dictionary entry point (M4 can render it inside a lesson). Lazy-loads the
 * history data + animation chunk only when a character with sourced history is shown, and falls
 * back gracefully when the chunk cannot be fetched (offline and not cached).
 */
export function HanziHistory({ glyph }: { glyph: string }) {
  const supported = hasHanziHistory(glyph);
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'error' } | { s: 'ready'; View: ComponentType<{ glyph: string }> }
  >({ s: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supported) return;
    let live = true;
    import('./HanziHistoryView')
      .then((m) => live && setState({ s: 'ready', View: m.default }))
      .catch(() => live && setState({ s: 'error' }));
    return () => {
      live = false;
    };
  }, [supported, attempt]);

  if (!supported) return null;
  if (state.s === 'loading')
    return (
      <p className="mt-5 text-sm text-fg-muted" data-testid="hanzi-history-loading">
        Đang tải lịch sử chữ…
      </p>
    );
  if (state.s === 'error')
    return (
      <div className="mt-5 text-sm text-fg-muted" role="status" data-testid="hanzi-history-offline">
        Không tải được lịch sử chữ (có thể đang ngoại tuyến).{' '}
        <button
          type="button"
          className="text-link underline"
          onClick={() => {
            setState({ s: 'loading' });
            setAttempt((a) => a + 1);
          }}
        >
          Thử lại
        </button>
      </div>
    );
  return <state.View glyph={glyph} />;
}

/** Renders history for every character of a word that has sourced history. */
export function HanziHistoryForWord({ word, glyphs }: { word: string; glyphs: string[] }) {
  return (
    <div data-testid="hanzi-history-word" data-word={word}>
      {glyphs.map((g) => (
        <HanziHistory key={g} glyph={g} />
      ))}
    </div>
  );
}
