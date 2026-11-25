'use client';
import { ButtonLink, EmptyState, Tabs } from '@/components/ui';

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
            <EmptyState
              variant="coming-soon"
              hanzi="书"
              title="Chưa có giáo trình"
              description="Khóa học khởi động có nguồn rõ ràng, chia chương và bài."
              milestone="M2"
            />
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
