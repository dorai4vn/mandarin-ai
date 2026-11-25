import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_SC, Nunito } from 'next/font/google';
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
/** Nunito 600/800 — brand lockup only (D-041, docs/design/brand/README.md). */
const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '800'],
  display: 'swap',
  variable: '--font-nunito',
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
  // UI-7B (D-041): approved raster icons. app/favicon.ico (16/32/48) is served at /favicon.ico.
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
  },
  appleWebApp: { capable: true, title: 'Mandarin AI', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // bg.page per theme (UI-6). An explicit in-app choice updates these at runtime (ThemePicker).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9fd' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1422' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${notoSansSC.variable} ${nunito.variable}`}
      // data-sidebar / data-theme are set by the inline script below before React hydrates.
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* UI-3/UI-6: apply the remembered sidebar and theme choices before first paint (no flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement,v=localStorage.getItem('mandarin.sidebar');if(v==='expanded'||v==='collapsed')d.dataset.sidebar=v;var t=localStorage.getItem('mandarin.theme');if(t==='light'||t==='dark'){d.dataset.theme=t;document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.content=t==='dark'?'#0e1422':'#f7f9fd'})}}catch(e){}",
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-2"
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
