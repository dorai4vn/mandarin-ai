import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { OfflineProvider } from '@/components/OfflineProvider';
import { PwaProvider } from '@/components/PwaProvider';
import './globals.css';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f0' },
    { media: '(prefers-color-scheme: dark)', color: '#171513' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
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
