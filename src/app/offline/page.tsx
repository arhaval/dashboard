/**
 * Offline Page
 * Shown by service worker when user is offline and no cached version exists
 */

import Link from 'next/link';

export const metadata = {
  title: 'Çevrimdışı | Arhaval',
};

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Icon */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
        style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
      >
        📡
      </div>

      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
      >
        Bağlantı Yok
      </h1>

      <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        İnternet bağlantın yok. Daha önce ziyaret ettiğin sayfalar önbellekten gösterilebilir,
        ancak yeni verilere erişmek için bağlantı gerekiyor.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center h-12 px-6 rounded-[var(--radius-md)] text-sm font-semibold text-white"
        style={{ background: 'var(--color-accent)' }}
      >
        Tekrar Dene
      </Link>
    </div>
  );
}
