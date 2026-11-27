'use client';

import { Card, Segmented } from '@/components/ui';
import { useTheme } from '@/design/theme';

/**
 * Appearance (UI-6, TOKENS_V2 §7): Sáng / Tối / Theo hệ thống. Persistence lives in
 * src/design/theme.ts (shared with every other theme control).
 */
export function ThemeCard() {
  const [choice, change] = useTheme();
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
