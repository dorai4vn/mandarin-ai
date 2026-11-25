import { CardLink, Card, PageHeader } from '@/components/ui';
import { InstallCard } from './install-card';
import { ThemeCard } from './theme-card';

export const metadata = { title: 'Hồ sơ' };

/**
 * Profile — M0 frame (SCREEN_BLUEPRINTS_V2 §7). Account management (change password, sign out)
 * is M1 (D-038: e-mail + password issued by the administrator, invite only — no self sign-up).
 */
export default function Profile() {
  return (
    <>
      <PageHeader title="Hồ sơ & cài đặt" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Tài khoản" headingLevel="h2">
          <p className="text-sm text-fg-muted">
            Ứng dụng riêng tư: đăng nhập bằng email và mật khẩu do quản trị viên cấp. Đổi mật khẩu
            và đăng xuất sẽ có ở M1.
          </p>
          <CardLink
            href="/lab/session"
            title="Phiên đăng nhập (M0)"
            description="Đăng nhập thử để kiểm tra kết nối."
            className="mt-4"
          />
        </Card>
        <ThemeCard />
        <InstallCard />
        <CardLink
          href="/lab"
          title="Kiểm tra kỹ thuật"
          description="Phòng thử M0 — khả năng trình duyệt."
        />
      </div>
    </>
  );
}
