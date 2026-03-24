/**
 * Match Operations Page — Server-centric view
 * Each registered DatHost server is a card. Start matches, view live scores,
 * manage BO3 series — all from one page.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService, dathostService } from '@/services';
import { ServerGrid } from './server-grid';
import { ServerManagement } from './server-management';

export default async function OperationsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const [servers, teams] = await Promise.all([
    dathostService.getServersWithMatches(),
    cs2Service.getTeams(),
  ]);

  return (
    <PageShell
      title="Operasyonlar"
      description="Sunucular ve mac yonetimi"
      actions={
        <Link
          href="/matches"
          className="rounded border border-[#2A2A2A] px-3 py-1.5 text-sm text-[#A1A1A1] hover:text-[#FAFAFA]"
        >
          Maclar
        </Link>
      }
    >
      {/* Server Cards Grid */}
      <ServerGrid servers={servers} teams={teams} />

      {/* Server Management (collapsible, bottom) */}
      <div className="mt-8">
        <ServerManagement servers={servers} />
      </div>
    </PageShell>
  );
}
