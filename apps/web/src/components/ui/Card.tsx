import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from './Badge';
import {
  ArrowRightIcon,
  BookOpenFilledIcon,
  HeadphonesFilledIcon,
  PencilFilledIcon,
} from '../icons';

/**
 * Card (COMPONENT_SPEC_V2 §9). Static cards have no shadow, only `border.default`; the interactive
 * card is ONE link (no nested buttons) with hover shadow + strong border. Padding 16/20/24.
 */
export type CardVariant = 'default' | 'interactive' | 'subtle' | 'highlight';
export type HighlightTone = 'secondary' | 'accent' | 'primary' | 'success';

const VARIANT: Record<Exclude<CardVariant, 'interactive'>, string> = {
  default: 'border border-line bg-surface',
  subtle: 'bg-subtle',
  highlight: 'border border-line border-l-4 bg-surface',
};
const HIGHLIGHT: Record<HighlightTone, string> = {
  secondary: 'border-l-secondary-base',
  accent: 'border-l-accent',
  primary: 'border-l-primary-base',
  success: 'border-l-success-base',
};
const PAD = 'p-4 md:p-5 lg:p-6';

function Header({
  title,
  action,
  as: H = 'h2',
}: {
  title?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  if (!title && !action) return null;
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      {title && <H className="min-w-0 text-lg font-semibold leading-[26px] text-fg">{title}</H>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  footer,
  children,
  variant = 'default',
  tone = 'secondary',
  as: Tag = 'section',
  headingLevel = 'h2',
  className = '',
  ...rest
}: {
  title?: ReactNode;
  /** Secondary action at the right of the title (e.g. a ghost button). */
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  variant?: Exclude<CardVariant, 'interactive'>;
  /** Left accent colour for `highlight` (lavender = AI hint, coral = streak). */
  tone?: HighlightTone;
  as?: 'section' | 'article' | 'div';
  headingLevel?: 'h2' | 'h3';
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <Tag
      {...rest}
      className={`rounded-card ${VARIANT[variant]} ${variant === 'highlight' ? HIGHLIGHT[tone] : ''} ${PAD} ${className}`}
    >
      <Header title={title} action={action} as={headingLevel} />
      {children}
      {footer && <div className="mt-4 border-t border-line pt-4">{footer}</div>}
    </Tag>
  );
}

/** Whole card is one link (single click target). */
export function CardLink({
  href,
  title,
  description,
  children,
  className = '',
  ...rest
}: {
  href: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <Link
      href={href}
      {...rest}
      className={`group block rounded-card border border-line bg-surface ${PAD} transition-[box-shadow,border-color] duration-[var(--duration-fast)] hover:border-line-strong hover:shadow-sm ${className}`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-lg font-semibold leading-[26px] text-fg">{title}</span>
          {description && <span className="mt-1 block text-sm text-fg-muted">{description}</span>}
        </span>
        <ArrowRightIcon
          width={20}
          height={20}
          className="mt-0.5 shrink-0 text-fg-subtle transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-primary-text motion-reduce:transition-none"
        />
      </span>
      {children}
    </Link>
  );
}

/* ---------- Study Card (pastel tiles of the reference "Hôm nay học gì?") ---------- */

export type StudyTone = 'blue' | 'lavender' | 'mint';
const STUDY: Record<StudyTone, { bg: string; icon: string; Icon: typeof BookOpenFilledIcon }> = {
  blue: { bg: 'bg-study-blue', icon: 'text-study-blue-icon', Icon: BookOpenFilledIcon },
  lavender: {
    bg: 'bg-study-lavender',
    icon: 'text-study-lavender-icon',
    Icon: HeadphonesFilledIcon,
  },
  mint: { bg: 'bg-study-mint', icon: 'text-study-mint-icon', Icon: PencilFilledIcon },
};

/**
 * Study Card. Shows only REAL data: `meta` must come from the learner's data (e.g. a real count);
 * when the feature does not exist yet pass `comingSoon` (badge "Sắp có", not clickable) instead of
 * a made-up number. With `href` the whole tile is one link.
 */
export function StudyCard({
  tone,
  title,
  meta,
  href,
  comingSoon = false,
  icon,
  className = '',
  ...rest
}: {
  tone: StudyTone;
  title: string;
  meta?: ReactNode;
  href?: string;
  comingSoon?: boolean;
  /** Override the default icon of the tone (aria-hidden, decorative). */
  icon?: ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  const t = STUDY[tone];
  const body = (
    <>
      <span
        aria-hidden
        className={`${t.icon} flex size-10 items-center justify-center md:size-12 [&>svg]:size-full`}
      >
        {icon ?? <t.Icon width={48} height={48} />}
      </span>
      <span className="mt-3 block text-lg font-bold leading-[26px] text-fg md:text-xl md:leading-7">
        {title}
      </span>
      {comingSoon ? (
        <Badge variant="neutral" className="mt-1.5 bg-surface/70">
          Sắp có
        </Badge>
      ) : (
        meta && <span className="mt-1 block text-sm text-fg-muted md:text-base">{meta}</span>
      )}
    </>
  );
  const cls = `${t.bg} flex aspect-[13/10] min-w-0 flex-col items-center justify-center rounded-panel px-3 py-4 text-center ${className}`;
  if (href && !comingSoon) {
    return (
      <Link
        href={href}
        {...rest}
        className={`${cls} transition-[box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:hover:translate-y-0`}
      >
        {body}
      </Link>
    );
  }
  return (
    <div {...rest} className={cls} aria-disabled={comingSoon || undefined}>
      {body}
    </div>
  );
}
