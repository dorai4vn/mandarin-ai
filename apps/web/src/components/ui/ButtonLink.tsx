import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './styles';

/**
 * Navigation that looks like a button: a real link, never a <button> that changes page.
 * Server-safe (no handlers), usable from Server Components.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  icon,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} {...props} className={buttonClasses({ variant, size, fullWidth, className })}>
      {icon}
      {children}
    </Link>
  );
}
