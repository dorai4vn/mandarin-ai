'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Single source of truth for Light / Dark / System (UI-6). The profile ThemeCard, the mnemonic lab
 * and any future control use this module so the choice persists identically (localStorage key
 * `mandarin.theme`, applied before first paint by the inline script in app/layout.tsx) and stays in
 * sync across components and tabs.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'mandarin.theme';
const PAGE_BG = { light: '#f7f9fd', dark: '#0e1422' } as const;

/** Current explicit choice from <html data-theme>; absence means follow the system. */
export function readTheme(): ThemeChoice {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Apply to the document (no persistence) and notify listeners (e.g. canvas redraw). */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const scheme = m.media.includes('dark') ? 'dark' : 'light';
    m.content = PAGE_BG[choice === 'system' ? scheme : choice];
  });
  window.dispatchEvent(new Event('mandarin:themechange'));
}

/** Apply and remember per device. If storage fails the choice lasts for this page only. */
export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage unavailable */
  }
}

/** React binding: `null` until mounted (avoids SSR mismatch); follows changes from other tabs. */
export function useTheme(): [ThemeChoice | null, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== THEME_KEY) return;
      const v = e.newValue;
      const next: ThemeChoice = v === 'light' || v === 'dark' ? v : 'system';
      applyTheme(next);
      setChoice(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const change = useCallback((c: ThemeChoice) => {
    setChoice(c);
    setTheme(c);
  }, []);
  return [choice, change];
}
