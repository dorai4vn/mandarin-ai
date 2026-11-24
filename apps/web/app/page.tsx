import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { SyncCard } from './sync-card';

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Hôm nay" className="xl:col-span-2">
          <p className="text-ink-2">
            Lịch ôn tập, từ mới trong ngày và chuỗi ngày học sẽ xuất hiện ở đây từ milestone M3. Bản
            M0 này dùng để kiểm tra nền tảng kỹ thuật trên nhiều trình duyệt.
          </p>
        </Card>
        <SyncCard />
      </div>
      <h2 className="mb-3 mt-8 text-xl font-semibold">Phòng thử M0</h2>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LAB.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block h-full rounded-2xl border border-line bg-surface p-4 transition hover:border-primary-base hover:shadow-sm"
            >
              <span className="font-semibold">{l.title} ›</span>
              <span className="mt-1 block text-sm text-ink-2">{l.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
