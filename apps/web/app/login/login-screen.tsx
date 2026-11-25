'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ButtonLink, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Only same-app paths ("/…", not "//host"), so `next` can never send the user elsewhere. */
export function safeNext(raw: string | null): string {
  return raw && /^\/(?![/\\])/.test(raw) ? raw : '/';
}

function Screen() {
  const auth = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  return (
    <>
      <PageHeader
        title="Đăng nhập"
        lead="Mandarin AI là ứng dụng riêng tư. Đăng nhập bằng email và mật khẩu chủ ứng dụng đã tạo cho bạn."
      />
      <Card className="max-w-[480px]">
        {auth.status === 'signed-in' ? (
          <div data-testid="login-already">
            <p>
              Bạn đang đăng nhập{auth.email ? ` bằng ${auth.email}` : ''}. Muốn dùng tài khoản khác,
              hãy đăng xuất trước.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href={next}>Tiếp tục</ButtonLink>
              <SignOutButton />
            </div>
          </div>
        ) : (
          <LoginForm onSignedIn={() => router.replace(next)} />
        )}
      </Card>
    </>
  );
}

export function LoginScreen() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <Screen />
    </Suspense>
  );
}
