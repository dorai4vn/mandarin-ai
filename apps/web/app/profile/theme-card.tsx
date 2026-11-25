'use client';

import { useEffect, useState } from 'react';
import { Card, Segmented } from '@/components/ui/index';

type Choice = 'system' | 'light' | 'dark';
const KEY = 'mandarin.theme';
const PAGE_BG = { light: '#f7f9fd', dark: '#0e1422' } as const;

/**
 * Appearance (UI-6, TOKENS_V2 §7): Sáng / Tối / Theo hệ thống. The choice is a per-device
 * convenience in localStorage; if storage fails the app simply follows the system. The same key is
 * applied before first paint by the inline script in app/layout.tsx (no colour flash).
 */
function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  // Browser UI colour: follow the explicit choice, or restore the per-scheme values.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const scheme = m.media.includes('dark') ? 'dark' : 'light';
    m.content = PAGE_BG[choice === 'system' ? scheme : choice];
  });
  window.dispatchEvent(new Event('mandarin:themechange'));
}

export function ThemeCard() {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(t === 'light' || t === 'dark' ? t : 'system');
  }, []);
  const change = (c: Choice) => {
    setChoice(c);
    apply(c);
    try {
      if (c === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, c);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  };
  return (
    <Card title="Giao diện" headingLevel="h2" data-testid="theme-card">
      <p className="mb-3 text-sm text-fg-muted">
        Mặc định theo cài đặt sáng/tối của thiết bị. Lựa chọn được nhớ trên thiết bị này.
      </p>
      {choice && (
        <Segmented
          legend="Giao diện"
          hideLegend
          data-testid="theme-picker"
          options={[
            { value: 'system', label: 'Theo hệ thống' },
            { value: 'light', label: 'Sáng' },
            { value: 'dark', label: 'Tối' },
          ]}
          value={choice}
          onChange={change}
        />
      )}
    </Card>
  );
}
