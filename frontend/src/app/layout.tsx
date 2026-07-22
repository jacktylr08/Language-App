import type { Metadata } from 'next';
import '@/styles/globals.css';
import { LanguageFlagBanner } from '@/components/LanguageFlagBanner';

export const metadata: Metadata = {
  title: 'Fluenta — Learn Spanish for real',
  description:
    'Interactive Spanish lessons that teach, test and adapt to you — from first words to real conversations.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <div className="ambient" aria-hidden="true" />
        <LanguageFlagBanner />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
