/**
 * Dashboard Layout
 * Protected layout for all dashboard routes
 * Contains Sidebar and Header structure
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from './dashboard-shell';
import type { User } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login');
  }

  // Get user profile from database
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // If user exists in auth but not in users table, they're not authorized
  if (dbError || !dbUser) {
    // Sign them out and redirect to login
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  // Check if user is active
  if (!dbUser.is_active) {
    await supabase.auth.signOut();
    redirect('/login?error=inactive');
  }

  const user: User = {
    id: dbUser.id,
    email: dbUser.email,
    full_name: dbUser.full_name,
    role: dbUser.role,
    avatar_url: dbUser.avatar_url,
    is_active: dbUser.is_active,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
