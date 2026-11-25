import { CardLink, PageHeader } from '@/components/ui';
import { AccountCard } from './account-card';
import { InstallCard } from './install-card';
import { ThemeCard } from './theme-card';

export const metadata = { title: 'Hồ sơ' };

/**
 * Profile (SCREEN_BLUEPRINTS_V2 §7). Account (D-042): sign-in state and sign-out; accounts are
 * created and managed by the owner in the Supabase Dashboard (no self sign-up).
 */
export default function Profile() {
  return (
    <>
      <PageHeader title="Hồ sơ & cài đặt" />
      <div className="grid gap-4 md:grid-cols-2">
        <AccountCard />
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
