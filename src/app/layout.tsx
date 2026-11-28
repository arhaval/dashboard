/**
 * Root Layout
 * Application-wide layout with fonts and metadata
 */

import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/notifications/service-worker-register';

// Tek tip tipografi: gövde + başlıklar Inter, rakamlar/tablolar Geist Mono.
// Profesyonel panel standardı (Vercel, Linear, Supabase, Stripe). Eski
// IBM Plex / DM Sans / Source Serif kaldırıldı — tüm site bu iki fontta.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Arhaval Yönetim Paneli',
    template: '%s | Arhaval',
  },
  description: 'Ekip yönetimi, iş takibi, ödemeler ve finansal işlemler için dahili yönetim paneli.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
  },
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arhaval',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  themeColor: '#0E0E11',
  colorScheme: 'dark',
  viewportFit: 'cover', // iOS notch support
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
