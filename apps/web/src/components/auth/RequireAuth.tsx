'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ButtonLink, Card, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * Pages with personal data render only for a signed-in user (D-042). This is the UX layer; the
 * protection is the API (401) + RLS, and local data that is never opened before sign-in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const path = usePathname() ?? '/';
  if (status === 'loading')
    return (
      <SkeletonGroup label="Đang kiểm tra đăng nhập">
        <Skeleton className="h-32 w-full" radius="card" />
      </SkeletonGroup>
    );
  if (status === 'signed-out')
    return (
      <Card data-testid="require-auth">
        <EmptyState
          variant="first-use"
          hanzi="锁"
          headingLevel="h2"
          title="Cần đăng nhập"
          description="Dữ liệu học của bạn chỉ hiện sau khi đăng nhập."
          primaryAction={
            <ButtonLink href={`/login?next=${encodeURIComponent(path)}`}>Đăng nhập</ButtonLink>
          }
        />
      </Card>
    );
  return <>{children}</>;
}
