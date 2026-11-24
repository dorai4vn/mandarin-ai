import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Thư viện' };

export default function Library() {
  return (
    <>
      <PageHeader
        title="Thư viện"
        lead="Khóa học → chương → bài học, và giáo trình PDF bạn nhập (M2, M4)."
      />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Khóa học của bạn">
          <p className="text-ink-2">
            Chưa có khóa học. Khóa khởi động và chức năng nhập PDF sẽ có ở M2/M4.
          </p>
        </Card>
        <Card title="Nhập giáo trình">
          <p className="text-ink-2">Thử tải PDF ở Phòng thử M0 → “Tải PDF”.</p>
        </Card>
      </div>
    </>
  );
}
