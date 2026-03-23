/**
 * Match Operations Page
 * Overview of all active matches, server status, and server management.
 * Admin only.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { cs2Service, userService, dathostService } from '@/services';
import { tr } from '@/lib/i18n';
import { DATHOST_MAP_STATUS_COLORS, DATHOST_SERVER_STATUS_COLORS } from '@/constants';
import type { CS2Match, CS2MatchMap, DatHostServer } from '@/types';
import { ServerManagement } from './server-management';
import { LiveMatchCard } from './live-match-card';
import { QuickImport } from './quick-import';

export default async function OperationsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const [activeMatches, servers] = await Promise.all([
    cs2Service.getActiveMatches(),
    dathostService.getServers(),
  ]);

  const t = tr.cs2.dathost;

  return (
    <PageShell
      title={t.operations}
      description={t.operationsDesc}
      actions={
        <Link
          href="/matches"
          className="rounded border border-[#2A2A2A] px-3 py-1.5 text-sm text-[#A1A1A1] hover:text-[#FAFAFA]"
        >
          {tr.cs2.matches}
        </Link>
      }
    >
      {/* Quick Import */}
      <QuickImport servers={servers} />

      {/* Server Status Bar */}
      <div className="flex flex-wrap gap-2">
        {servers.map((server) => {
          const statusColor = DATHOST_SERVER_STATUS_COLORS[server.server_status] || '';
          const statusLabel = t.serverStatus[server.server_status as keyof typeof t.serverStatus] || server.server_status;
          return (
            <div
              key={server.id}
              className="flex items-center gap-2 rounded border border-[#2A2A2A] bg-[#141414] px-3 py-2"
            >
              <span className="text-sm font-medium text-[#FAFAFA]">{server.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          );
        })}
        {servers.length === 0 && (
          <p className="text-sm text-[#6B6B6B]">{t.noServers}</p>
        )}
      </div>

      {/* Active Matches Grid */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-[#FAFAFA]">{t.activeMatches}</h3>
        {activeMatches.length === 0 ? (
          <p className="text-sm text-[#6B6B6B]">{t.noActiveMatches}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeMatches.map((match) => (
              <LiveMatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* Server Management (collapsible) */}
      <div className="mt-8">
        <ServerManagement servers={servers} />
      </div>
    </PageShell>
  );
}
