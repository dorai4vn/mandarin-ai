'use client';
import { useTheme, type ThemeChoice } from '@/design/theme';
import { MonitorIcon, MoonIcon, SunIcon } from '../icons';

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ThemeChoice, string> = {
  system: 'Theo hệ thống',
  light: 'Sáng',
  dark: 'Tối',
};

/**
 * Global Light / Dark / System control for the app shell. One button cycles Theo hệ thống → Sáng →
 * Tối; state and persistence come from the shared module (src/design/theme.ts), identical to the
 * profile ThemeCard and the mnemonic lab.
 */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const [choice, change] = useTheme();
  const current = choice ?? 'system';
  const Icon = current === 'light' ? SunIcon : current === 'dark' ? MoonIcon : MonitorIcon;
  return (
    <button
      type="button"
      data-testid="shell-theme-toggle"
      data-theme-choice={current}
      onClick={() => change(NEXT[current])}
      aria-label={`Giao diện: ${LABEL[current]}. Nhấn để chuyển sang ${LABEL[NEXT[current]]}`}
      className="flex h-11 min-w-11 items-center justify-center gap-3 rounded-control px-2.5 text-sm font-medium text-fg-muted hover:bg-[var(--state-hover)] hover:text-fg"
    >
      <Icon width={24} height={24} className="shrink-0" />
      {withLabel && <span className="nav-label whitespace-nowrap">{LABEL[current]}</span>}
    </button>
  );
}
