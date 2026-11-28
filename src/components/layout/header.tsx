/**
 * Header Component
 * Tessera tarzı üst bar: ortada arama (⌘K, çok sayfalı rollerde) · sağda aksiyonlar.
 * Çerçevenin içinde akar (sabit değil).
 */

'use client';

import * as React from 'react';
import { LogOut, User as UserIcon, ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/layout/command-palette';
import { NotificationButton } from '@/components/notifications/notification-button';
import { InstallButton } from '@/components/notifications/install-button';
import { tr } from '@/lib/i18n';
import type { User } from '@/types';

interface HeaderProps {
  user: User;
  allowedPages: string[];
  onSignOut?: () => void;
  onMenuToggle?: () => void;
}

export function Header({ user, allowedPages, onSignOut, onMenuToggle }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header
      className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex h-14 items-center gap-4 px-4 lg:px-5">
        {/* Sol: menü (mobil). Sayfa adı başlık satırında — burada tekrar yok. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] lg:hidden"
            aria-label="Menüyü aç"
            title="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Orta: arama */}
        <div className="hidden flex-1 justify-center md:flex">
          <CommandPalette userRole={user.role} allowedPages={allowedPages} />
        </div>

        {/* Sağ: aksiyonlar */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <InstallButton />
          <NotificationButton />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] pl-1 pr-2.5 text-sm transition-colors',
                'hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)]',
                isMenuOpen && 'bg-[var(--color-bg-secondary)]'
              )}
              aria-label="Kullanıcı menüsü"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--color-accent-muted)] text-[11px] font-semibold text-[var(--color-accent)]">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <span className="hidden max-w-[120px] truncate font-medium text-[var(--color-text-primary)] sm:block">
                {user.full_name.split(' ')[0]}
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform', isMenuOpen && 'rotate-180')} />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-1rem)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 animate-fade-in"
                style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
              >
                <div className="border-b border-[var(--color-border)] px-4 py-3">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{user.full_name}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-[var(--color-accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
                    {tr.roles[user.role as keyof typeof tr.roles] || user.role}
                  </span>
                </div>
                <a
                  href={`/team/${user.id}`}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  <UserIcon className="h-4 w-4" />
                  {tr.header.profile}
                </a>
                <div className="my-1 border-t border-[var(--color-border)]" />
                <button
                  onClick={() => { setIsMenuOpen(false); onSignOut?.(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-muted)]"
                >
                  <LogOut className="h-4 w-4" />
                  {tr.header.signOut}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
