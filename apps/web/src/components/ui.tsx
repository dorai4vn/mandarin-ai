import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-prose text-ink-2">{lead}</p>}
      </div>
      {aside}
    </header>
  );
}

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
    <section className={`rounded-2xl border border-line bg-paper-2/60 p-4 md:p-5 ${className}`}>
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles =
    variant === 'primary'
      ? 'bg-seal text-seal-ink hover:brightness-110'
      : 'border border-line bg-transparent text-ink hover:bg-paper-2';
  return (
    <button
      type="button"
      {...props}
      className={`min-h-11 rounded-xl px-4 py-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-paper-2 p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  );
}
