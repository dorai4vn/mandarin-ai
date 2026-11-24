'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertIcon } from '../icons';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';

/**
 * ErrorState (COMPONENT_SPEC_V2 §18): what happened + what to do next, plain language, no stack
 * traces (internal code only under a collapsed "Chi tiết"). Distinct from the Offline state.
 *  - inline: one line under a control/section;
 *  - section: inside a card, icon + title + explanation + "Thử lại";
 *  - page: the page could not load; "Thử lại" receives focus on mount (the user's context was
 *    lost anyway), plus "Về Hôm nay".
 * `announce` (default true) sets role="alert" — use it for errors that appear after an action.
 * Focus is only moved for `page`; inline/section never steal focus.
 */
export function ErrorState({
  level = 'section',
  title,
  description,
  onRetry,
  retryLabel = 'Thử lại',
  retrying = false,
  details,
  homeHref = '/',
  announce = true,
  headingLevel = 'h3',
  className = '',
  'data-testid': testId,
}: {
  level?: 'inline' | 'section' | 'page';
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  /** Technical detail (Phòng thử): shown collapsed. */
  details?: string;
  homeHref?: string;
  announce?: boolean;
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
  'data-testid'?: string;
}) {
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (level === 'page') retry.current?.focus();
  }, [level]);

  const role = announce ? 'alert' : undefined;

  if (level === 'inline') {
    return (
      <p
        role={role}
        data-testid={testId}
        className={`flex items-start gap-1.5 text-sm leading-5 text-error-text ${className}`}
      >
        <AlertIcon width={18} height={18} className="mt-px shrink-0" />
        <span className="min-w-0">
          <span className="font-semibold">{title}</span>
          {description && <> {description}</>}
        </span>
      </p>
    );
  }

  const H = headingLevel;
  const page = level === 'page';
  return (
    <div
      role={role}
      data-testid={testId}
      data-level={level}
      className={`flex min-w-0 flex-col ${page ? 'mx-auto max-w-[480px] items-center py-12 text-center' : 'items-start'} ${className}`}
    >
      <AlertIcon
        width={page ? 40 : 24}
        height={page ? 40 : 24}
        className="mb-2 shrink-0 text-error-text"
      />
      <H
        className={`font-semibold text-fg ${page ? 'text-[22px] leading-[30px]' : 'text-lg leading-[26px]'}`}
      >
        {title}
      </H>
      {description && (
        <div className="mt-1.5 max-w-prose text-sm leading-5 text-fg-muted">{description}</div>
      )}
      {(onRetry || page) && (
        <div className={`mt-4 flex flex-wrap gap-3 ${page ? 'justify-center' : ''}`}>
          {onRetry && (
            <Button
              ref={retry}
              variant={page ? 'primary' : 'secondary'}
              loading={retrying}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}
          {page && (
            <ButtonLink href={homeHref} variant={onRetry ? 'secondary' : 'primary'}>
              Về Hôm nay
            </ButtonLink>
          )}
        </div>
      )}
      {details && (
        <details className="mt-4 w-full max-w-prose text-left text-sm text-fg-muted">
          <summary className="cursor-pointer select-none font-medium text-fg">Chi tiết</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-control bg-sunken p-3 font-mono text-xs text-fg">
            {details}
          </pre>
        </details>
      )}
    </div>
  );
}
