/**
 * Root Layout
 * Application-wide layout with fonts and metadata
 */

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, DM_Sans } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  title: {
    default: 'Arhaval Yönetim Paneli',
    template: '%s | Arhaval',
  },
  description: 'Ekip yönetimi, iş takibi, ödemeler ve finansal işlemler için dahili yönetim paneli.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F4F7FE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${dmSans.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
