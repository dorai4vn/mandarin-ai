import type { ComponentProps, ReactNode } from 'react';
import { Button as V2Button, Card as V2Card, type ButtonVariant } from './ui/index';

/** PageHeader V2 (UI-2B) — same API as M0. */
export { PageHeader } from './ui/PageHeader';

/*
 * LEGACY entry point (M0 API). New code imports from '@/components/ui/index' (lint-enforced in
 * new UI files, M3). UI-2: Card and Button come from the V2 primitives (src/components/ui/). These wrappers keep the
 * M0 API so existing screens keep working unchanged: `Card title` → V2 default card; `Button
 * variant="ghost"` meant the OUTLINED button in M0 → V2 `secondary` (COMPONENT_SPEC_V2 §1).
 */
/** @deprecated M0 API — use `Card` from '@/components/ui/index'. */
export function Card({
  title,
  children,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <V2Card title={title} className={className}>
      {children}
    </V2Card>
  );
}

/**
 * @deprecated M0 API — use `Button` from '@/components/ui/index'. Here `variant="ghost"` means the
 * OUTLINED (secondary) button for M0 call sites; in '@/components/ui/index' `ghost` is borderless.
 */
export function Button({
  variant = 'primary',
  ...props
}: Omit<ComponentProps<typeof V2Button>, 'variant'> & {
  variant?: 'primary' | 'ghost' | ButtonVariant;
}) {
  return <V2Button {...props} variant={variant === 'ghost' ? 'secondary' : variant} />;
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-sunken p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
      {children}
    </pre>
  );
}
