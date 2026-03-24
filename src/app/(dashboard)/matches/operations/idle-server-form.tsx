'use client';

import { useState, useTransition } from 'react';
import { quickStartMatch } from '../match-actions';
import { CS2_MAPS } from '@/constants';
import { Button } from '@/components/ui/button';
import type { CS2Team } from '@/types';

interface IdleServerFormProps {
  serverId: string;
  teams: CS2Team[];
}

export function IdleServerForm({ serverId, teams }: IdleServerFormProps) {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError('');
    formData.set('server_id', serverId);
    startTransition(async () => {
      const result = await quickStartMatch(formData);
      if (result && 'error' in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <select
          name="team1_id"
          required
          className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded-[4px] px-2 py-1.5 text-sm text-[#FAFAFA]"
        >
          <option value="">Takim 1</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.tag} - {t.name}</option>
          ))}
        </select>
        <span className="text-[#6B6B6B] text-xs">vs</span>
        <select
          name="team2_id"
          required
          className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded-[4px] px-2 py-1.5 text-sm text-[#FAFAFA]"
        >
          <option value="">Takim 2</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.tag} - {t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <select
          name="map"
          required
          className="flex-1 bg-[#1F1F1F] border border-[#2A2A2A] rounded-[4px] px-2 py-1.5 text-sm text-[#FAFAFA]"
        >
          <option value="">Harita</option>
          {CS2_MAPS.map((m) => (
            <option key={m} value={m}>{m.replace('de_', '')}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? 'Baslatiliyor...' : 'Baslat'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
