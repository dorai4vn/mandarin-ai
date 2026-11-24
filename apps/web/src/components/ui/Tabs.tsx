'use client';

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

/**
 * Tabs (COMPONENT_SPEC_V2 §5) — WAI-ARIA Tabs pattern with automatic activation. Segmented is
 * 44 px tall (spec 40; +4 px so each tab, extended by ::before, is a 44 px touch target).
 *
 * role tablist/tab/tabpanel, aria-selected, aria-controls/aria-labelledby, roving tabIndex,
 * ←/→ (wrapping), Home/End. `segmented` (subtle track, selected = surface + shadow.xs) for
 * 2–4 short tabs; `underline` (44 px, 2 px primary.base indicator) for content tabs.
 * Too wide → the tablist scrolls horizontally inside itself; the page never scrolls sideways.
 * Focus ring is drawn INSIDE each tab: the scrolling tablist would clip an outside ring.
 * The indicator slides with `translate` (200 ms); reduced motion → instant (global rule).
 */
export type TabItem = { id: string; label: ReactNode; content: ReactNode };

export function Tabs({
  label,
  items,
  variant = 'segmented',
  value,
  defaultValue,
  onValueChange,
  className = '',
  'data-testid': testId,
}: {
  /** Accessible name of the tablist. */
  label: string;
  items: TabItem[];
  variant?: 'segmented' | 'underline';
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  className?: string;
  'data-testid'?: string;
}) {
  const base = useId();
  const [inner, setInner] = useState(defaultValue ?? items[0]?.id);
  const selected = value ?? inner;
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const list = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);

  const select = (id: string) => {
    if (value === undefined) setInner(id);
    onValueChange?.(id);
  };

  useLayoutEffect(() => {
    const i = items.findIndex((t) => t.id === selected);
    const el = tabs.current[i];
    if (!el) return;
    setIndicator({ x: el.offsetLeft, w: el.offsetWidth });
    // Keep the selected tab visible inside a horizontally scrolling list — scroll the LIST only
    // (scrollIntoView could also scroll the page on first render).
    const l = list.current;
    if (l) {
      if (el.offsetLeft < l.scrollLeft) l.scrollLeft = el.offsetLeft;
      else if (el.offsetLeft + el.offsetWidth > l.scrollLeft + l.clientWidth)
        l.scrollLeft = el.offsetLeft + el.offsetWidth - l.clientWidth;
    }
  }, [selected, items]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === selected);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(items[next]!.id);
    tabs.current[next]?.focus();
  };

  const seg = variant === 'segmented';
  return (
    <div className={`min-w-0 ${className}`} data-testid={testId}>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`relative flex max-w-full overflow-x-auto [scrollbar-width:none] ${seg ? 'w-fit gap-1 rounded-control bg-subtle p-1' : 'border-b border-line'}`}
      >
        {indicator && (
          <span
            aria-hidden
            className={`pointer-events-none absolute left-0 transition-[translate] duration-[var(--duration-base)] ease-[var(--ease-standard)] ${seg ? 'top-1 bottom-1 rounded-[8px] bg-surface shadow-xs' : 'bottom-0 h-0.5 bg-primary-base'}`}
            style={{ width: indicator.w, translate: `${indicator.x}px 0` }}
          />
        )}
        {items.map((t, i) => {
          const on = t.id === selected;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              data-touch={seg ? 'extended' : undefined}
              onClick={() => select(t.id)}
              className={`relative z-[1] shrink-0 whitespace-nowrap font-semibold focus-visible:outline-offset-[-3px]! transition-colors duration-[var(--duration-fast)] ${
                seg
                  ? `h-9 min-w-11 rounded-[8px] px-3 text-sm before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] ${on ? 'text-fg' : 'text-fg-muted hover:text-fg'}`
                  : `h-11 min-w-11 px-4 text-base ${on ? 'text-primary-text' : 'text-fg-muted hover:text-fg'}`
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== selected}
          tabIndex={0}
          className="mt-4 rounded-control"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
