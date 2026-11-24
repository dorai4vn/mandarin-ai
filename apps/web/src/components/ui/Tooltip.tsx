'use client';

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * Tooltip (COMPONENT_SPEC_V2 §24) — supplementary only: never the only place information lives.
 * WCAG 2.2 SC 1.4.13 "Content on Hover or Focus":
 *  - hoverable: the bubble is inside the hover area, so the pointer can move onto it;
 *  - dismissible: Escape hides it without moving hover or focus;
 *  - persistent: no timeout — it stays until hover/focus leaves or it is dismissed.
 * Shown on mouse hover and on keyboard focus; touch taps do not open it (not a touch channel).
 * The trigger gets aria-describedby → role="tooltip". The bubble is shifted to stay inside the
 * viewport (no horizontal overflow at 320 px).
 */
type TriggerProps = {
  'aria-describedby'?: string;
};

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactElement<TriggerProps>;
  side?: 'top' | 'bottom';
}) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shift, setShift] = useState(0);
  const bubble = useRef<HTMLSpanElement>(null);
  const open = (hovered || focused) && !dismissed;

  // A fresh hover or focus re-arms a tooltip that was dismissed with Escape.
  const arm = useCallback(() => setDismissed(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !bubble.current) return;
    const margin = 8;
    const r = bubble.current.getBoundingClientRect();
    const base = r.left - shift;
    const width = r.width;
    const max = document.documentElement.clientWidth - margin;
    let next = 0;
    if (base < margin) next = margin - base;
    else if (base + width > max) next = max - (base + width);
    if (next !== shift) setShift(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const describedBy = [children.props['aria-describedby'], id].filter(Boolean).join(' ');

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        arm();
        setHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setHovered(false);
      }}
      onFocus={(e) => {
        // Only keyboard-style focus (focus-visible) opens it; a mouse click focus does not.
        if ((e.target as Element).matches?.(':focus-visible')) {
          arm();
          setFocused(true);
        }
      }}
      onBlur={() => setFocused(false)}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      {/* Outer box = hit area incl. a transparent 8 px bridge to the trigger (hoverable). */}
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        hidden={!open}
        style={{ translate: `calc(-50% + ${shift}px) 0` }}
        className={`absolute left-1/2 z-30 w-max max-w-[min(240px,calc(100vw-16px))] ${side === 'top' ? 'bottom-full pb-2' : 'top-full pt-2'}`}
      >
        <span className="block rounded-control bg-inverse px-2.5 py-1.5 text-center text-sm font-medium leading-5 text-fg-inverse shadow-md">
          {content}
        </span>
      </span>
    </span>
  );
}
