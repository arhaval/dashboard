/**
 * Dashboard Layout
 * Protected layout for all dashboard routes
 * Contains Sidebar and Header structure
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userService } from '@/services';
import { permissionService } from '@/services/permission.service';
import { landingPathFor, pageKeyForPath } from '@/constants/permissions';
import { DashboardShell } from './dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached: shared with the page + any server action in this request.
  const user = await userService.getCurrentUser();

  // Middleware already blocks unauthenticated requests, so reaching here with
  // no profile means an auth session without a users row → sign out.
  if (!user) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  if (!user.is_active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login?error=inactive');
  }

  // Central role → page access (matrix, editable from /ayarlar/yetkiler).
  const allowedPages = await permissionService.getAllowedPages(user.role);

  // URL-level guard: block direct navigation to a page the role can't access.
  // Hedef, rolün açılış sayfası — `/` değil: ana sayfası kapalı bir rolde `/`
  // de yasak olduğu için sonsuz yönlendirme oluyordu.
  const pathname = (await headers()).get('x-pathname') ?? '';
  const pageKey = pageKeyForPath(pathname);
  if (pageKey && !allowedPages.includes(pageKey)) {
    const landing = landingPathFor(allowedPages, user.role);
    if (landing !== pathname) redirect(landing);
  }

  // Hiç sayfası olmayan rol: yönlendirecek yer yok, sayfa da gösterilmemeli.
  if (allowedPages.length === 0) {
    return (
      <DashboardShell user={user} allowedPages={allowedPages}>
        <div className="p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Hesabına henüz sayfa yetkisi tanımlanmamış. Yönetici ile iletişime geç.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell user={user} allowedPages={allowedPages}>
      {children}
    </DashboardShell>
  );
}
