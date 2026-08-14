/**
 * Sosyal Medya bölümünün ortak kabuğu.
 *
 * Sidebar'da tek giriş var; üç ekran buradaki sekmelerle ayrılıyor. Başlık ve
 * sekmeler layout'ta olduğu için sekme değiştirirken yeniden çizilmiyorlar.
 */

import { Suspense } from 'react';
import { PageShell } from '@/components/layout';
import { tr } from '@/lib/i18n';
import { SocialNav } from './social-nav';

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell title={tr.pages.social.title}>
      {/* useSearchParams istemci tarafında Suspense sınırı ister. */}
      <Suspense fallback={<div style={{ height: 42 }} />}>
        <SocialNav />
      </Suspense>
      {children}
    </PageShell>
  );
}
