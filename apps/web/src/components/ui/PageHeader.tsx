import type { ReactNode } from 'react';

/**
 * PageHeader V2 (COMPONENT_SPEC_V2 §24, TOKENS_V2 §4.2). Server-safe. M0 API kept (title, lead,
 * aside). h1 = text.h1: 26/34 below 768 px, 30/38 from 768, 700, −0.015em. Long titles wrap
 * (min-w-0, break-words) — never horizontal overflow. Exactly one h1 per page.
 */
export function PageHeader({
  title,
  lead,
  aside,
  eyebrow,
}: {
  title: string;
  lead?: ReactNode;
  aside?: ReactNode;
  /** Small label above the title (e.g. section name). */
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-medium text-fg-muted">{eyebrow}</p>}
        <h1 className="break-words text-[26px] font-bold leading-[34px] tracking-[-0.015em] text-fg md:text-[30px] md:leading-[38px]">
          {title}
        </h1>
        {lead && <p className="mt-2 max-w-prose text-fg-muted">{lead}</p>}
      </div>
      {aside && <div className="min-w-0">{aside}</div>}
    </header>
  );
}
