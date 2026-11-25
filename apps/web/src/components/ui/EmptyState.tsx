import type { ReactNode } from 'react';
import { HanziText } from '../Hanzi';
import { Badge } from './Badge';

/**
 * EmptyState (COMPONENT_SPEC_V2 §17). Server-safe. No data yet, or a feature not launched yet
 * (`coming-soon`: neutral badge "Ra mắt ở Mx", NO action — never a fake button).
 * Illustration ≤ 96 px (a faint Hanzi by default for first-use), title, 1–2 sentences, at most one
 * primary + one secondary action. Centered, max 360 px.
 */
export type EmptyVariant = 'first-use' | 'no-results' | 'coming-soon' | 'filtered';

type Common = {
  title: string;
  description?: ReactNode;
  /** Faint large Hanzi used as the illustration (e.g. 学). */
  hanzi?: string;
  illustration?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
  'data-testid'?: string;
};

type Props =
  | (Common & { variant: 'coming-soon'; milestone: string })
  | (Common & {
      variant?: Exclude<EmptyVariant, 'coming-soon'>;
      primaryAction?: ReactNode;
      secondaryAction?: ReactNode;
    });

export function EmptyState(props: Props) {
  const {
    title,
    description,
    hanzi,
    illustration,
    headingLevel: H = 'h3',
    className = '',
    'data-testid': testId,
  } = props;
  const variant = props.variant ?? 'first-use';
  const compact = variant === 'no-results' || variant === 'filtered';
  const art =
    illustration ??
    (hanzi && !compact ? (
      <HanziText aria-hidden className="text-[72px] leading-none text-fg-disabled">
        {hanzi}
      </HanziText>
    ) : null);
  return (
    <div
      data-testid={testId}
      data-variant={variant}
      className={`mx-auto flex max-w-[360px] flex-col items-center text-center ${compact ? 'py-6' : 'py-10'} ${className}`}
    >
      {art && <div className="mb-4 flex max-h-24 items-center justify-center">{art}</div>}
      <H className="text-lg font-semibold leading-[26px] text-fg">{title}</H>
      {description && <p className="mt-1.5 text-sm leading-5 text-fg-muted">{description}</p>}
      {props.variant === 'coming-soon' ? (
        <Badge variant="neutral" className="mt-4">
          Ra mắt ở {props.milestone}
        </Badge>
      ) : (
        (props.primaryAction || props.secondaryAction) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {props.primaryAction}
            {props.secondaryAction}
          </div>
        )
      )}
    </div>
  );
}
