import { LibraryTabs } from './library-tabs';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Thư viện' };

/**
 * Library — honest M0 version (SCREEN_BLUEPRINTS_V2 §5). "Thư viện" (courses + your documents)
 * is a different feature from a future "Học bài" (lessons); nothing here pretends to be a lesson.
 */
export default function Library() {
  return (
    <>
      <PageHeader
        title="Thư viện"
        lead="Giáo trình (khóa học → chương → bài) và tài liệu PDF bạn nhập."
      />
      <LibraryTabs />
    </>
  );
}
