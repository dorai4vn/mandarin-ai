'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Skeleton (COMPONENT_SPEC_V2 §16). Blocks are decorative (aria-hidden); the container announces
 * the busy state once (aria-busy + hidden "Đang tải…"). Shimmer = a translating highlight
 * (transform only), off with reduced motion. Use `useShowAfter` so loads under 300 ms show
 * nothing (no flash). Shapes should match the real layout (no CLS).
 */
const RADIUS = {
  control: 'rounded-control',
  card: 'rounded-card',
  full: 'rounded-full',
  text: 'rounded-[6px]',
} as const;

export function Skeleton({
  className = '',
  radius = 'text',
}: {
  className?: string;
  radius?: keyof typeof RADIUS;
}) {
  return (
    <span
      aria-hidden
      data-skeleton=""
      className={`skeleton relative block overflow-hidden bg-subtle ${RADIUS[radius]} ${className}`}
    />
  );
}

export function SkeletonGroup({
  children,
  label = 'Đang tải…',
  className = '',
  'data-testid': testId,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <div aria-busy="true" className={className} data-testid={testId}>
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}

/** true only after `active` has stayed true for `delay` ms (default 300 ms). */
export function useShowAfter(active: boolean, delay = 300) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setShow(true), delay);
    // Reset when loading stops, so the next load waits again.
    return () => {
      clearTimeout(t);
      setShow(false);
    };
  }, [active, delay]);
  return active && show;
}
