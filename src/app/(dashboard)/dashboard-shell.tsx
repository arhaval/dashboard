/**
 * Dashboard Shell Component
 * Client component that wraps the dashboard layout
 * Handles client-side interactions (sign out, etc.)
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Header } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface DashboardShellProps {
  user: User;
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <Sidebar userRole={user.role} />

      {/* Header */}
      <Header user={user} onSignOut={handleSignOut} />

      {/* Main Content Area */}
      <main
        className={cn(
          'min-h-screen',
          'ml-[var(--sidebar-width)]',
          'pt-[var(--header-height)]'
        )}
      >
        {children}
      </main>
    </div>
  );
}
