/**
 * Dashboard Layout
 * Protected layout for all dashboard routes
 * Contains Sidebar and Header structure
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { permissionService } from '@/services/permission.service';
import { pageKeyForPath } from '@/constants/permissions';
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
    // Contact & Payment fields
    phone: dbUser.phone,
    iban: dbUser.iban,
    bank_name: dbUser.bank_name,
    address: dbUser.address,
    notes: dbUser.notes,
  };

  // Central role → page access (matrix, editable from /ayarlar/yetkiler).
  const allowedPages = await permissionService.getAllowedPages(user.role);

  // URL-level guard: block direct navigation to a page the role can't access.
  const pathname = (await headers()).get('x-pathname') ?? '';
  const pageKey = pageKeyForPath(pathname);
  if (pageKey && !allowedPages.includes(pageKey)) {
    redirect('/');
  }

  return (
    <DashboardShell user={user} allowedPages={allowedPages}>
      {children}
    </DashboardShell>
  );
}
