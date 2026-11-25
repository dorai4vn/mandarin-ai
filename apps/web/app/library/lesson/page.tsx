import { Suspense } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ButtonLink, PageHeader } from '@/components/ui';
import { LessonScreen } from '@/learning/LessonScreen';

export const metadata = { title: 'Bài học' };

export default function LessonPage() {
  return (
    <>
      <PageHeader
        title="Bài học"
        aside={
          <ButtonLink href="/library" variant="secondary" size="sm">
            ‹ Thư viện
          </ButtonLink>
        }
      />
      <RequireAuth>
        <Suspense>
          <LessonScreen />
        </Suspense>
      </RequireAuth>
    </>
  );
}
