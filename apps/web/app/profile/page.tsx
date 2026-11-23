import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { InstallCard } from './install-card';

export const metadata = { title: 'Hồ sơ' };

export default function Profile() {
  return (
    <>
      <PageHeader title="Hồ sơ & cài đặt" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Tài khoản">
          <p className="text-ink-2">Đăng nhập bằng mã OTP qua email sẽ hoàn thiện ở M1.</p>
          <Link className="mt-2 inline-block text-seal underline" href="/lab/session">
            Phiên đăng nhập (M0)
          </Link>
        </Card>
        <InstallCard />
        <Card title="Kiểm tra kỹ thuật">
          <Link className="text-seal underline" href="/lab">
            Phòng thử M0 — khả năng trình duyệt
          </Link>
        </Card>
      </div>
    </>
  );
}
