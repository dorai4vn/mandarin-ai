'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { detectCapabilities, missingCore, type Capability } from '@/platform/capabilities';
import { MoreIcon, PanelLeftIcon } from './icons';
import { SYNC_DISABLED_MESSAGE, useOffline } from './OfflineProvider';
import { PRIMARY, SECONDARY, isActive, type NavItem } from './shell/nav';
import { Sheet } from './ui/Sheet';
import { Tooltip } from './ui/Tooltip';

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

/* ---------------- Sidebar preference (UI-3, COMPONENT_SPEC_V2 §7) ---------------- */

type SidebarPref = 'auto' | 'expanded' | 'collapsed';
const SIDEBAR_KEY = 'mandarin.sidebar';

/**
 * `auto` = collapsed 1024–1279, expanded ≥ 1280 (CSS media query, so no flash before
 * hydration). An explicit choice is remembered in localStorage — a convenience only: storage
 * errors fall back to `auto`.
 */
function useSidebarPref() {
  const [pref, setPref] = useState<SidebarPref>('auto');
  const [wide, setWide] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === 'expanded' || v === 'collapsed') setPref(v);
    } catch {
      /* storage unavailable: keep auto */
    }
    const mq = matchMedia('(min-width: 1280px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const expanded = pref === 'expanded' || (pref === 'auto' && wide);
  const toggle = useCallback(() => {
    const next: SidebarPref = expanded ? 'collapsed' : 'expanded';
    setPref(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      /* ignore */
    }
  }, [expanded]);
  return { pref, expanded, toggle };
}

function Mark({ size = 36 }: { size?: number }) {
  return (
    <span
      lang="zh-Hans"
      aria-hidden
      style={{ width: size, height: size }}
      className="hanzi grid shrink-0 place-items-center rounded-control bg-logo text-lg text-logo-ink"
    >
      学
    </span>
  );
}

function SideItem({ item, path }: { item: NavItem; path: string }) {
  const { href, label, Icon } = item;
  const on = isActive(path, href);
  return (
    <Tooltip content={label} side="right" bubbleClassName="nav-tip">
      <Link
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`flex h-11 items-center gap-3 rounded-control px-3 font-medium transition-colors duration-[var(--duration-fast)] ${on ? 'bg-primary-subtle text-primary-strong' : 'text-fg hover:bg-[var(--state-hover)]'}`}
      >
        <Icon width={24} height={24} className="shrink-0" />
        <span className="nav-label whitespace-nowrap">{label}</span>
      </Link>
    </Tooltip>
  );
}

/** Sidebar for tablet (`rail`: always collapsed) and desktop (`desktop`: collapsible). */
function Sidebar({
  variant,
  path,
  expanded,
  onToggle,
}: {
  variant: 'rail' | 'desktop';
  path: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const desktop = variant === 'desktop';
  return (
    <aside
      id={desktop ? 'sidebar' : undefined}
      data-testid={desktop ? 'nav-sidebar' : 'nav-rail'}
      className={`${desktop ? 'sidebar-desktop hidden lg:flex' : 'sidebar-rail hidden md:flex lg:hidden'} sticky top-0 z-20 h-dvh flex-col gap-1 border-r border-line bg-surface px-3 py-4`}
    >
      <Link
        href="/"
        className="mb-4 flex h-11 items-center gap-3 rounded-control px-1.5 text-lg font-bold"
        aria-label="Mandarin AI — Trang chủ"
      >
        <Mark />
        <span className="nav-label whitespace-nowrap" aria-hidden>
          Mandarin AI
        </span>
      </Link>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {PRIMARY.map((item) => (
          <SideItem key={item.href} item={item} path={path} />
        ))}
        <div className="my-3 border-t border-line" role="presentation" />
        {SECONDARY.map((item) => (
          <SideItem key={item.href} item={item} path={path} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <div className="nav-sync">
          <SyncChip />
        </div>
        <div className="nav-sync-compact">
          <SyncChip compact />
        </div>
        {desktop && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="sidebar"
            data-testid="sidebar-toggle"
            className="flex h-11 items-center gap-3 rounded-control px-3 text-sm font-medium text-fg-muted hover:bg-[var(--state-hover)] hover:text-fg"
          >
            <PanelLeftIcon width={24} height={24} className="shrink-0" />
            <span className="nav-label whitespace-nowrap">
              {expanded ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}
            </span>
            {!expanded && <span className="sr-only">Mở rộng thanh bên</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

/** True while a text field has focus (virtual keyboard likely open on phones). */
function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isText = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(
            el.type,
          )));
    const onIn = (e: FocusEvent) => setTyping(isText(e.target));
    const onOut = () => setTyping(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}

function BottomNav({ path }: { path: string }) {
  const [more, setMore] = useState(false);
  const typing = useTyping();
  const moreActive = SECONDARY.some((i) => isActive(path, i.href));
  const cell =
    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium [@media(max-height:499px)]:min-h-12';
  const label = '[@media(max-height:499px)]:sr-only';
  return (
    <>
      <nav
        data-testid="nav-bottom"
        aria-label="Điều hướng chính"
        data-hidden-for-keyboard={typing || undefined}
        className={`fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur md:hidden ${typing ? 'hidden' : 'grid'} grid-cols-5`}
      >
        {PRIMARY.map(({ href, label: text, Icon }) => {
          const on = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? 'page' : undefined}
              className={`${cell} ${on ? 'text-primary-text' : 'text-fg-muted'}`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${on ? 'bg-primary-subtle' : ''}`}
              >
                <Icon width={22} height={22} />
              </span>
              <span className={label}>{text}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-haspopup="dialog"
          aria-expanded={more}
          data-testid="nav-more"
          className={`${cell} ${moreActive ? 'text-primary-text' : 'text-fg-muted'}`}
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-primary-subtle' : ''}`}
          >
            <MoreIcon width={22} height={22} />
          </span>
          <span className={label}>Thêm</span>
        </button>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="Thêm" data-testid="more-sheet">
        <ul className="flex flex-col gap-1">
          {SECONDARY.map(({ href, label: text, Icon }) => {
            const on = isActive(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => setMore(false)}
                  className={`flex min-h-12 items-center gap-3 rounded-control px-3 font-medium ${on ? 'bg-primary-subtle text-primary-strong' : 'text-fg hover:bg-[var(--state-hover)]'}`}
                >
                  <Icon width={24} height={24} />
                  {text}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}

/**
 * Responsive shell (UI-3, D-039 breakpoints, RESPONSIVE_V2): phone < 768 → top bar + bottom
 * navigation (5: four destinations + "Thêm" sheet); tablet 768–1023 → collapsed sidebar
 * (`nav-rail`); desktop ≥ 1024 → sidebar (`nav-sidebar`) collapsed by default below 1280 and
 * expanded from 1280, user-toggleable and remembered.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '/';
  const { pref, expanded, toggle } = useSidebarPref();
  return (
    <div
      className="app-shell min-h-dvh md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[var(--sidebar-w)_1fr]"
      data-sidebar={pref}
    >
      <Sidebar variant="rail" path={path} />
      <Sidebar variant="desktop" path={path} expanded={expanded} onToggle={toggle} />

      <div className="flex min-w-0 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface/90 pb-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur min-[360px]:pl-[max(1rem,env(safe-area-inset-left))] min-[360px]:pr-[max(1rem,env(safe-area-inset-right))] md:hidden [@media(max-height:499px)]:min-h-11">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
            <Mark size={32} /> <span className="truncate">Mandarin AI</span>
          </Link>
          <SyncChip />
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-[1120px] flex-1 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 min-[360px]:px-4 md:px-6 md:pb-10 md:pt-8 lg:px-8 xl:px-10"
        >
          <CompatibilityNotice />
          {children}
        </main>
      </div>

      <BottomNav path={path} />
    </div>
  );
}
