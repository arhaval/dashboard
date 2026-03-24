'use client';

import { ServerCard } from './server-card';
import type { DatHostServer, CS2Team } from '@/types';

interface ServerGridProps {
  servers: DatHostServer[];
  teams: CS2Team[];
}

export function ServerGrid({ servers, teams }: ServerGridProps) {
  if (servers.length === 0) {
    return (
      <p className="text-sm text-[#6B6B6B]">
        Kayitli sunucu yok. Asagidan sunucu ekleyin.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {servers.map((server) => (
        <ServerCard key={server.id} server={server} teams={teams} />
      ))}
    </div>
  );
}
