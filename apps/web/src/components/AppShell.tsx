'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { detectCapabilities, missingCore, type Capability } from '@/platform/capabilities';
import { MoreIcon, PanelLeftIcon } from './icons';
import { PRIMARY, SECONDARY, isActive, type NavItem } from './shell/nav';
import { OfflineBanner } from './shell/OfflineBanner';
import { SyncIndicator } from './shell/SyncIndicator';
import { ThemeToggle } from './shell/ThemeToggle';
import { Sheet } from './ui/Sheet';
import { ToastProvider } from './ui/Toast';
import { Tooltip } from './ui/Tooltip';

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
 * `auto` = collapsed 1024–1279, expanded ≥ 1280 (CSS media query). An explicit choice is
 * remembered in localStorage (a convenience: storage errors fall back to `auto`). The choice is
 * applied as `data-sidebar` on <html> by an inline script in app/layout.tsx BEFORE first paint,
 * so a remembered choice does not flash; the CSS in globals.css reads that attribute.
 */
function useSidebarPref() {
  const [pref, setPref] = useState<SidebarPref>('auto');
  const [wide, setWide] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const v = document.documentElement.dataset.sidebar;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v === 'expanded' || v === 'collapsed') setPref(v);
    const mq = matchMedia('(min-width: 1280px)');
    const on = () => setWide(mq.matches);
    on();
    setReady(true);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const expanded = pref === 'expanded' || (pref === 'auto' && wide);
  const toggle = useCallback(() => {
    const next: SidebarPref = expanded ? 'collapsed' : 'expanded';
    setPref(next);
    document.documentElement.dataset.sidebar = next;
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      /* ignore */
    }
  }, [expanded]);
  // Before hydration aria-expanded is unknown: omit it rather than state something wrong.
  return { expanded: ready ? expanded : undefined, toggle };
}

/** Brand mark (D-041): the approved raster image, light/dark per theme via `--brand-mark`. */
function Mark({ size = 40 }: { size?: number }) {
  return <span aria-hidden style={{ width: size, height: size }} className="brand-mark shrink-0" />;
}

/**
 * Lockup text (docs/design/brand/README.md): "Mandarin AI" Nunito 800, −0.02em, line-height 1.1;
 * tagline Nunito 600, uppercase, 0.16em, 38 % of the name size. Name size = 0.52 × mark (sidebar).
 */
function Lockup({ tagline = true, nameSize }: { tagline?: boolean; nameSize: number }) {
  return (
    <span className="flex min-w-0 flex-col font-brand" aria-hidden>
      <span
        style={{ fontSize: nameSize }}
        className="truncate font-extrabold leading-[1.1] tracking-[-0.02em] text-brand-name"
      >
        Mandarin AI
      </span>
      {tagline && (
        <span
          style={{ fontSize: Math.round(nameSize * 0.38 * 10) / 10 }}
          className="truncate font-semibold uppercase leading-[1.3] tracking-[0.16em] text-brand-tagline"
        >
          Tự học tiếng Trung
        </span>
      )}
    </span>
  );
}

function SideItem({ item, path }: { item: NavItem; path: string }) {
  const { href, label, Icon } = item;
  const on = isActive(path, href);
  return (
    <Tooltip content={label} side="right" bubbleClassName="nav-tip" wrapperClassName="flex">
      <Link
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`flex h-11 flex-1 items-center gap-3 rounded-control px-3 font-medium transition-colors duration-[var(--duration-fast)] ${on ? 'bg-primary-subtle text-primary-strong' : 'text-fg hover:bg-[var(--state-hover)]'}`}
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
  expanded?: boolean | undefined;
  onToggle?: () => void;
}) {
  const desktop = variant === 'desktop';
  return (
    <aside
      id={desktop ? 'sidebar' : undefined}
      data-testid={desktop ? 'nav-sidebar' : 'nav-rail'}
      className={`${desktop ? 'sidebar-desktop hidden lg:flex' : 'sidebar-rail hidden md:flex lg:hidden'} sticky top-0 z-20 h-dvh flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-line bg-surface py-4 pl-[max(0.75rem,env(safe-area-inset-left))] pr-3`}
    >
      <Link
        href="/"
        className="mb-4 flex h-12 items-center gap-2.5 rounded-control px-1"
        aria-label="Mandarin AI — Trang chủ"
      >
        <Mark size={40} />
        <span className="nav-label min-w-0">
          <Lockup nameSize={21} />
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
          <SyncIndicator align="start" />
        </div>
        <div className="nav-sync-compact flex justify-center">
          <SyncIndicator compact />
        </div>
        <ThemeToggle withLabel={desktop} />
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
            <span className="nav-label toggle-collapse whitespace-nowrap">Thu gọn thanh bên</span>
            <span className="nav-label toggle-expand whitespace-nowrap">Mở rộng thanh bên</span>
          </button>
        )}
      </div>
    </aside>
  );
}

/** True while a text field has focus (virtual keyboard likely open on phones). */
/** A focused element that brings up the virtual keyboard. */
const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(
        el.type,
      )));

function useTyping(path: string) {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    // Show the bar again only after the keyboard had time to close: re-showing it at once on
    // focusout would put it under the finger mid-tap (e.g. a button just below a text field).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const recheck = () => setTyping(isTextField(document.activeElement));
    // Only a text field turns "typing" on at once; turning it off is left to the focusout
    // timer (and the checks below), so the bar never re-appears under a finger mid-tap.
    const onIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      clearTimeout(timer);
      setTyping(true);
    };
    const onOut = () => {
      clearTimeout(timer);
      timer = setTimeout(recheck, 250);
    };
    // Keyboard closed without blurring (Android Back): the visual viewport grows back.
    const vv = window.visualViewport;
    const onViewport = () => {
      if (vv && vv.height > window.innerHeight * 0.85) setTyping(false);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    vv?.addEventListener('resize', onViewport);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
      vv?.removeEventListener('resize', onViewport);
    };
  }, []);
  // A focused field removed with the page (route change) fires no focusout in every browser.
  useEffect(() => {
    const t = setTimeout(() => {
      setTyping(isTextField(document.activeElement));
    }, 0);
    return () => clearTimeout(t);
  }, [path]);
  return typing;
}

function BottomNav({ path }: { path: string }) {
  const [more, setMore] = useState(false);
  const typing = useTyping(path);
  const moreActive = SECONDARY.some((i) => isActive(path, i.href));
  const cell =
    'flex min-h-14 flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium [@media(max-height:499px)]:min-h-12 [@media(max-height:499px)]:py-0';
  // Full names, never truncated (e.g. "Từ điển cá nhân" wraps to two centred lines on narrow phones).
  const label =
    'max-w-full px-0.5 text-center leading-[14px] [overflow-wrap:anywhere] [@media(max-height:499px)]:sr-only';
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
              <span className={label} data-testid="nav-bottom-label">
                {text}
              </span>
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
          <span className={label} data-testid="nav-bottom-label">
            Thêm
          </span>
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
                  replace
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
  const { expanded, toggle } = useSidebarPref();
  return (
    <ToastProvider>
      <div className="app-shell min-h-dvh md:grid md:grid-cols-[calc(72px+env(safe-area-inset-left))_1fr] lg:grid-cols-[calc(var(--sidebar-w)+env(safe-area-inset-left))_1fr]">
        <Sidebar variant="rail" path={path} />
        <Sidebar variant="desktop" path={path} expanded={expanded} onToggle={toggle} />

        <div className="flex min-w-0 flex-col">
          {/* Phone top bar */}
          <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface/90 pb-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur min-[360px]:pl-[max(1rem,env(safe-area-inset-left))] min-[360px]:pr-[max(1rem,env(safe-area-inset-right))] md:hidden [@media(max-height:499px)]:min-h-11">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2"
              aria-label="Mandarin AI — Trang chủ"
            >
              <Mark size={32} />
              <Lockup nameSize={17} tagline={false} />
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SyncIndicator />
            </div>
          </header>
          <OfflineBanner />
          <main
            id="main"
            className="mx-auto w-full max-w-[1120px] flex-1 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 min-[360px]:px-4 md:pb-10 md:pl-6 md:pr-[max(1.5rem,env(safe-area-inset-right))] md:pt-8 lg:pl-8 lg:pr-[max(2rem,env(safe-area-inset-right))] xl:pl-10 xl:pr-[max(2.5rem,env(safe-area-inset-right))]"
          >
            <CompatibilityNotice />
            {children}
          </main>
        </div>

        <BottomNav path={path} />
      </div>
    </ToastProvider>
  );
}
