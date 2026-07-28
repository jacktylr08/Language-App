import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { LanguageFlagBanner } from '@/components/LanguageFlagBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ThemeScript } from '@/components/ThemeScript';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Fluenta — Learn Spanish for real',
  description:
    'Interactive Spanish lessons that teach, test and adapt to you — from first words to real conversations.',
  manifest: '/manifest.json',
  applicationName: 'Fluenta',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Fluenta',
    // The header sits under the status bar, so the bar blends into the app
    // rather than sitting on an opaque black strip.
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#141915' },
  ],
  // The app is a full-screen experience once installed; letting the page zoom
  // makes a double-tap on an answer button jump the whole layout.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeScript />
        <ServiceWorkerRegister />
        <div className="ambient" aria-hidden="true" />
        <LanguageFlagBanner />
        <main className="min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
