import type { ReactNode } from 'react';

/** Monospace block for technical details (lab screens). Server-safe. Long tokens wrap. */
export function Mono({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-sunken p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
      {children}
    </pre>
  );
}
