/**
 * Header Component
 * Top header bar for the dashboard
 * Contains user menu and global actions
 */

'use client';

import * as React from 'react';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tr } from '@/lib/i18n';
import type { User } from '@/types';

interface HeaderProps {
  user?: User | null;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]';
      case 'PUBLISHER':
        return 'bg-[var(--color-info-muted)] text-[var(--color-info)]';
      case 'EDITOR':
        return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
      case 'VOICE':
        return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]';
      default:
        return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
    }
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30',
        'h-[var(--header-height)]',
        'left-[var(--sidebar-width)]',
        'border-b border-[var(--color-border)]',
        'bg-[var(--color-bg-primary)]'
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Left side - can be used for breadcrumbs or search */}
        <div className="flex items-center gap-4">
          {/* Placeholder for breadcrumbs or search */}
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  'flex items-center gap-3',
                  'rounded-[var(--radius-md)] px-3 py-2',
                  'transition-colors',
                  'hover:bg-[var(--color-bg-tertiary)]',
                  isMenuOpen && 'bg-[var(--color-bg-tertiary)]'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center',
                    'rounded-full',
                    'bg-[var(--color-bg-tertiary)]',
                    'text-sm font-medium text-[var(--color-text-primary)]'
                  )}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  )}
                </div>

                {/* Name and role */}
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {user.full_name}
                  </p>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5',
                      'text-xs font-medium',
                      getRoleBadgeColor(user.role)
                    )}
                  >
                    {tr.roles[user.role as keyof typeof tr.roles] || user.role}
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[var(--color-text-muted)]',
                    'transition-transform',
                    isMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  className={cn(
                    'absolute right-0 top-full mt-2',
                    'w-56 rounded-[var(--radius-md)]',
                    'border border-[var(--color-border)]',
                    'bg-[var(--color-bg-secondary)]',
                    'py-1',
                    'animate-fade-in'
                  )}
                >
                  {/* User info (mobile) */}
                  <div className="border-b border-[var(--color-border)] px-4 py-3 md:hidden">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <button
                    className={cn(
                      'flex w-full items-center gap-3',
                      'px-4 py-2',
                      'text-sm text-[var(--color-text-secondary)]',
                      'transition-colors',
                      'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    <UserIcon className="h-4 w-4" />
                    {tr.header.profile}
                  </button>

                  <div className="my-1 border-t border-[var(--color-border)]" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignOut?.();
                    }}
                    className={cn(
                      'flex w-full items-center gap-3',
                      'px-4 py-2',
                      'text-sm text-[var(--color-error)]',
                      'transition-colors',
                      'hover:bg-[var(--color-error-muted)]'
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    {tr.header.signOut}
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
            <Button variant="default" size="sm">
              {tr.header.signIn}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
