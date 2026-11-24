import type { ComponentProps, ReactNode } from 'react';
import { Button as V2Button, Card as V2Card, type ButtonVariant } from './ui/index';

export function PageHeader({
  title,
  lead,
  aside,
}: {
  title: string;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-prose text-ink-2">{lead}</p>}
      </div>
      {aside}
    </header>
  );
}

/*
 * UI-2: Card and Button come from the V2 primitives (src/components/ui/). These wrappers keep the
 * M0 API so existing screens keep working unchanged: `Card title` → V2 default card; `Button
 * variant="ghost"` meant the OUTLINED button in M0 → V2 `secondary` (COMPONENT_SPEC_V2 §1).
 */
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
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-sunken p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  );
}
