/**
 * Root Layout
 * Application-wide layout with fonts and metadata
 */

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, DM_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/notifications/service-worker-register';

// Typography setup per CLAUDE.md specifications
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

/**
 * Miktarlar ve başlıklar için editoryal serif.
 *
 * Sayıları mono ile yazmak "mühendislik çıktısı" hissi veriyordu; bu ekran bir
 * finansal rapor gibi okunmalı. Serif rakamlar hem daha resmi hem daha okunaklı.
 * Hizalama gerektiren tablo değerleri mono kalmaya devam ediyor.
 */
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
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
  themeColor: '#FF4D00',
  colorScheme: 'light',
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
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${dmSans.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
