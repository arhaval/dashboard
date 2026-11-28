'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, Header } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

interface DashboardShellProps {
  user: User;
  allowedPages: string[];
  children: React.ReactNode;
}

/**
 * Tessera tarzı uygulama çerçevesi:
 *   koyu zemin → yuvarlak çerçeve → [sidebar | (üst bar + kayan içerik)]
 * Navigasyon tek yerde: sidebar (ikon şeridi tekrar ettiği için kaldırıldı).
 * Mobilde çerçeve kalkar, sidebar soldan kayan çekmece olur.
 */
export function DashboardShell({ user, allowedPages, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Sayfa değişince mobil çekmeceyi kapat
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Mobil çekmece açıkken arka planı kilitle
  React.useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (sidebarOpen && isMobile) document.body.classList.add('sidebar-open');
    else document.body.classList.remove('sidebar-open');
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="h-[100dvh] bg-[var(--color-backdrop)] lg:p-3">
      <div className="flex h-full overflow-hidden bg-[var(--color-bg-primary)] lg:rounded-[18px] lg:border lg:border-[var(--color-border)]">
        <Sidebar
          userRole={user.role}
          allowedPages={allowedPages}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={user}
            allowedPages={allowedPages}
            onSignOut={handleSignOut}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
