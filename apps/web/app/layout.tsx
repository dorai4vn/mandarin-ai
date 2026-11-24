import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_SC } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { OfflineProvider } from '@/components/OfflineProvider';
import { PwaProvider } from '@/components/PwaProvider';
import './globals.css';

/*
 * Fonts (D-039, TOKENS_V2 §4): downloaded at BUILD time and served from this app's own origin
 * (/_next/static/media) — browsers never contact Google Fonts. Both are variable fonts (one file
 * per subset covers every weight).
 * - Inter: UI text, Vietnamese and pinyin (latin-ext covers ǎ ǐ ǒ ǔ ǖ ǘ ǚ ǜ). Preloaded.
 * - Noto Sans SC: Chinese. Google splits it into ~100 unicode-range slices; the browser downloads
 *   only the slices whose characters appear on the page, so it is NOT preloaded.
 */
const inter = Inter({
  // Preload only what every page needs (Vietnamese UI); latin-ext (pinyin tone marks) stays
  // in the CSS with its unicode-range and is fetched on the pages that use it.
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});
const notoSansSC = Noto_Sans_SC({
  display: 'swap',
  preload: false,
  variable: '--font-noto-sc',
  fallback: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
});

export const metadata: Metadata = {
  title: { default: 'Mandarin AI', template: '%s · Mandarin AI' },
  description: 'Học tiếng Trung cho người Việt — trên máy tính, máy tính bảng và điện thoại.',
  applicationName: 'Mandarin AI',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Mandarin AI', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // V2 light page background (dark mode is a separate phase, D-039 decision 4).
  themeColor: '#f7f9fd',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${notoSansSC.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-paper focus:p-2"
        >
          Bỏ qua tới nội dung
        </a>
        <noscript>
          <p style={{ padding: 16 }}>
            Mandarin AI cần bật JavaScript. Hãy bật JavaScript hoặc dùng trình duyệt hiện đại
            (Chrome, Edge, Firefox, Safari).
          </p>
        </noscript>
        <PwaProvider>
          <OfflineProvider>
            <AppShell>{children}</AppShell>
          </OfflineProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
