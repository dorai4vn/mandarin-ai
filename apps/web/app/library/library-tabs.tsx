'use client';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ButtonLink, EmptyState, Tabs } from '@/components/ui';
import { CourseList } from '@/learning/CourseList';

export function LibraryTabs() {
  return (
    <Tabs
      label="Thư viện"
      variant="underline"
      data-testid="library-tabs"
      items={[
        {
          id: 'courses',
          label: 'Giáo trình',
          content: (
            <RequireAuth>
              <CourseList />
            </RequireAuth>
          ),
        },
        {
          id: 'documents',
          label: 'Tài liệu của tôi',
          content: (
            <div className="flex flex-col items-center">
              <EmptyState
                variant="coming-soon"
                hanzi="文"
                title="Nhập giáo trình PDF"
                description="Tải PDF lên, hệ thống trích xuất bài để bạn duyệt và sửa."
                milestone="M4"
              />
              <ButtonLink href="/lab/upload" variant="secondary" className="-mt-4 mb-6">
                Thử tải PDF (Phòng thử)
              </ButtonLink>
            </div>
          ),
        },
      ]}
    />
  );
}
