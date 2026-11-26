import { ButtonLink, Card, CardLink, EmptyState, PageHeader, StudyCard } from '@/components/ui';
import { SyncCard } from './sync-card';

/**
 * Home — honest M0 version (SCREEN_BLUEPRINTS_V2 §2): no streak / XP / due counts before the
 * engines exist (M3/M7). The study tiles of the reference ("Hôm nay học gì?") are shown as
 * "Sắp có", never with made-up numbers. Sync status is real data.
 */
const LAB = [
  {
    href: '/lab/handwriting',
    title: 'Viết chữ Hán',
    desc: 'Khung viết dùng chạm, chuột hoặc bút; nhận dạng qua máy chủ.',
  },
  {
    href: '/lab/audio',
    title: 'Micro & phát âm',
    desc: 'Xin quyền, ghi âm WAV 16 kHz, chấm phát âm (Azure).',
  },
  {
    href: '/lab/upload',
    title: 'Tải PDF',
    desc: 'Chọn tệp hoặc kéo-thả, kiểm tra loại/kích thước.',
  },
  {
    href: '/lab/offline',
    title: 'Offline & đồng bộ',
    desc: 'Ghi khi mất mạng, gửi đúng một lần khi có mạng lại.',
  },
  {
    href: '/lab/realtime',
    title: 'Hội thoại thời gian thực',
    desc: 'Kiểm tra cấp khóa tạm thời từ máy chủ.',
  },
  {
    href: '/lab',
    title: 'Khả năng trình duyệt',
    desc: 'Xem trình duyệt này hỗ trợ gì và phần nào là tùy chọn.',
  },
];

export default function Home() {
  return (
    <>
      <PageHeader
        title="Chào bạn 👋"
        lead="Mandarin AI chạy trực tiếp trên trình duyệt của máy tính, máy tính bảng và điện thoại. Cài đặt lên màn hình chính là tùy chọn."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-testid="home-today">
          <EmptyState
            variant="first-use"
            hanzi="学"
            headingLevel="h2"
            title="Ôn tập hằng ngày"
            description="Vào Luyện tập để ôn các thẻ đến hạn và học từ mới trong từ điển cá nhân của bạn."
            primaryAction={<ButtonLink href="/practice">Mở Luyện tập</ButtonLink>}
          />
        </Card>
        <SyncCard />
      </div>

      <section aria-labelledby="study" className="mt-10">
        <h2 id="study" className="mb-4 text-[22px] font-semibold leading-[30px] text-fg">
          Hôm nay học gì?
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4" data-testid="home-study">
          <StudyCard tone="blue" title="Từ vựng mới" comingSoon />
          <StudyCard tone="lavender" title="Nghe hiểu" comingSoon />
          <StudyCard tone="mint" title="Luyện viết" comingSoon />
        </div>
      </section>

      <section aria-labelledby="lab" className="mt-10">
        <h2 id="lab" className="mb-1 text-[22px] font-semibold leading-[30px] text-fg">
          Phòng thử M0
        </h2>
        <p className="mb-4 text-sm text-fg-muted">
          Kiểm tra nền tảng kỹ thuật trên trình duyệt này — không phải bài học.
        </p>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {LAB.map((l) => (
            <li key={l.href}>
              <CardLink href={l.href} title={l.title} description={l.desc} className="h-full" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
