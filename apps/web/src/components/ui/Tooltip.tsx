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
  bubbleClassName = '',
  wrapperClassName = 'inline-flex',
}: {
  content: ReactNode;
  children: ReactElement<TriggerProps>;
  /** 'right' (sidebar rail): beside the trigger, no flip/shift needed. */
  side?: 'top' | 'bottom' | 'right';
  /** Extra classes on the bubble (e.g. hide it when the trigger already shows its label). */
  bubbleClassName?: string;
  /** Display of the wrapper (default inline-flex; `flex` for full-width rows). */
  wrapperClassName?: string;
}) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shift, setShift] = useState(0);
  // side='right' is positioned `fixed` from the trigger rect so a scrolling sidebar cannot clip it.
  const [fixedAt, setFixedAt] = useState<{ left: number; top: number } | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'right'>(side);
  const bubble = useRef<HTMLSpanElement>(null);
  const open = (hovered || focused) && !dismissed;

  // A fresh hover or focus re-arms a tooltip that was dismissed with Escape.
  const arm = useCallback(() => setDismissed(false), []);

  useEffect(() => {
    if (!open) return;
    // Capture phase + stopPropagation: one Escape closes the tooltip only, not a surrounding
    // dialog/sheet (which would get the next Escape).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setDismissed(true);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  // Keep the bubble inside the viewport: horizontal shift + vertical flip; re-run on resize and
  // scroll while open (rotation, window resize, sticky header).
  const place = useCallback(() => {
    const el = bubble.current;
    if (!el) return;
    if (side === 'right') {
      const t = el.parentElement?.getBoundingClientRect();
      if (t) setFixedAt({ left: t.right, top: t.top + t.height / 2 });
      return;
    }
    const margin = 8;
    const trigger = el.parentElement?.getBoundingClientRect();
    if (trigger) {
      const h = el.offsetHeight;
      const roomAbove = trigger.top - h;
      const roomBelow = window.innerHeight - trigger.bottom - h;
      setPlacement(
        side === 'top'
          ? roomAbove < margin && roomBelow > roomAbove
            ? 'bottom'
            : 'top'
          : roomBelow < margin && roomAbove > roomBelow
            ? 'top'
            : 'bottom',
      );
    }
    const r = el.getBoundingClientRect();
    setShift((current) => {
      const base = r.left - current;
      const max = document.documentElement.clientWidth - margin;
      if (base < margin) return margin - base;
      if (base + r.width > max) return max - (base + r.width);
      return 0;
    });
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const describedBy = [children.props['aria-describedby'], id].filter(Boolean).join(' ');

  return (
    <span
      className={`relative ${wrapperClassName}`}
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
        // Browsers without :focus-visible throw on the selector: open on any focus there.
        let keyboard = true;
        try {
          keyboard = (e.target as Element).matches(':focus-visible');
        } catch {
          keyboard = true;
        }
        if (keyboard) {
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
        data-shift={Math.round(shift)}
        data-placement={placement}
        style={
          placement === 'right'
            ? { translate: '0 -50%', left: fixedAt?.left ?? 0, top: fixedAt?.top ?? 0 }
            : { translate: `calc(-50% + ${shift}px) 0` }
        }
        className={`${bubbleClassName} z-30 w-max max-w-[min(240px,calc(100vw-16px))] ${
          placement === 'right'
            ? 'fixed pl-2'
            : `absolute left-1/2 ${placement === 'top' ? 'bottom-full pb-2' : 'top-full pt-2'}`
        }`}
      >
        <span className="block rounded-control bg-inverse px-2.5 py-1.5 text-center text-sm font-medium leading-5 text-fg-inverse shadow-md">
          {content}
        </span>
      </span>
    </span>
  );
}
