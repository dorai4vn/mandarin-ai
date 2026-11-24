'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { detectCapabilities, missingCore, type Capability } from '@/platform/capabilities';
import { DictionaryIcon, HomeIcon, LabIcon, LibraryIcon, PracticeIcon, ProfileIcon } from './icons';
import { SYNC_DISABLED_MESSAGE, useOffline } from './OfflineProvider';

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PRIMARY: NavItem[] = [
  { href: '/', label: 'Trang chủ', Icon: HomeIcon },
  { href: '/library', label: 'Thư viện', Icon: LibraryIcon },
  { href: '/dictionary', label: 'Từ điển', Icon: DictionaryIcon },
  { href: '/practice', label: 'Luyện tập', Icon: PracticeIcon },
  { href: '/profile', label: 'Hồ sơ', Icon: ProfileIcon },
];
const SECONDARY: NavItem[] = [{ href: '/lab', label: 'Phòng thử M0', Icon: LabIcon }];

const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

function SyncChip({ compact = false }: { compact?: boolean }) {
  const { online, pending, rejected, store, syncAvailability } = useOffline();
  // "Đã đồng bộ" only when nothing is pending AND nothing was refused by the server (G1), and
  // never while the server has cloud sync switched off (then data is on this device only).
  const localOnly = syncAvailability === 'disabled';
  const text =
    rejected > 0
      ? `${rejected} lỗi đồng bộ`
      : !online
        ? 'Offline'
        : localOnly
          ? 'Lưu trên thiết bị'
          : pending > 0
            ? `${pending} chờ đồng bộ`
            : 'Đã đồng bộ';
  const description = localOnly && rejected === 0 && online ? SYNC_DISABLED_MESSAGE : text;
  const ok = rejected === 0 && online && pending === 0 && !localOnly;
  return (
    <span
      data-testid="sync-chip"
      data-sync-state={
        rejected > 0
          ? 'error'
          : !online
            ? 'offline'
            : localOnly
              ? 'local-only'
              : pending
                ? 'pending'
                : 'synced'
      }
      title={
        store?.kind === 'memory'
          ? 'Không có lưu trữ offline trên trình duyệt này'
          : localOnly
            ? SYNC_DISABLED_MESSAGE
            : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium ${compact ? '' : 'w-fit'}`}
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${rejected > 0 ? 'bg-error-base' : !online ? 'bg-warning' : localOnly ? 'bg-fg-subtle' : pending ? 'bg-primary-base' : 'bg-success'}`}
      />
      {compact && ok ? '' : text}
      <span className="sr-only">{description}</span>
    </span>
  );
}

function CompatibilityNotice() {
  const [missing, setMissing] = useState<Capability[]>([]);
  useEffect(() => {
    // One-shot read of browser capabilities after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMissing(missingCore(detectCapabilities(window as never)));
  }, []);
  if (missing.length === 0) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border-2 border-warning bg-warning-subtle p-3 text-sm"
    >
      <strong>Trình duyệt này thiếu một số khả năng:</strong>{' '}
      {missing.map((m) => `${m.label} — ${m.note}`).join(' · ')} Các phần khác của ứng dụng vẫn dùng
      được.
    </div>
  );
}

/**
 * Responsive shell (D-030): phone < md → top bar + bottom tab bar; tablet md–xl → navigation
 * rail; desktop ≥ xl → persistent sidebar with labels, secondary items and sync status.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '/';
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[5.5rem_1fr] xl:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside
        data-testid="nav-sidebar"
        className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface p-4 xl:flex"
      >
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-xl font-bold">
          <span
            lang="zh-Hans"
            className="hanzi grid h-9 w-9 place-items-center rounded-lg bg-logo text-logo-ink"
          >
            学
          </span>{' '}
          Mandarin AI
        </Link>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map(({ href, label, Icon }, i) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(path, href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium hover:bg-subtle ${i === PRIMARY.length ? 'mt-4 border-t border-line pt-4' : ''} ${isActive(path, href) ? 'bg-primary-subtle text-primary-strong' : 'text-fg'}`}
            >
              <Icon /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <SyncChip />
        </div>
      </aside>

      {/* Tablet rail */}
      <aside
        data-testid="nav-rail"
        className="sticky top-0 hidden h-dvh flex-col items-center gap-2 border-r border-line bg-surface py-4 md:flex xl:hidden"
      >
        <span
          lang="zh-Hans"
          className="hanzi mb-3 grid h-10 w-10 place-items-center rounded-lg bg-logo text-lg text-logo-ink"
          aria-hidden
        >
          学
        </span>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(path, href) ? 'page' : undefined}
              className={`flex w-[4.75rem] flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium hover:bg-subtle ${isActive(path, href) ? 'bg-primary-subtle text-primary-strong' : 'text-fg'}`}
            >
              <Icon /> <span className="text-center leading-tight">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <SyncChip compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/90 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span
              lang="zh-Hans"
              className="hanzi grid h-8 w-8 place-items-center rounded-lg bg-logo text-logo-ink"
            >
              学
            </span>{' '}
            Mandarin AI
          </Link>
          <SyncChip />
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8 xl:px-12"
        >
          <CompatibilityNotice />
          {children}
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav
        data-testid="nav-bottom"
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {PRIMARY.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(path, href) ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(path, href) ? 'text-primary-text' : 'text-fg-muted'}`}
          >
            <Icon width={22} height={22} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
