'use client';

import { useState, useActionState } from 'react';
import { addDatHostServer, removeDatHostServer } from '../match-actions';
import { tr } from '@/lib/i18n';
import { DATHOST_SERVER_STATUS_COLORS } from '@/constants';
import type { DatHostServer } from '@/types';

interface ServerManagementProps {
  servers: DatHostServer[];
}

type ActionState = {
  error?: string | Record<string, string[]>;
  success?: boolean;
} | null;

export function ServerManagement({ servers }: ServerManagementProps) {
  const t = tr.cs2.dathost;
  const [isOpen, setIsOpen] = useState(false);

  const [addState, addAction, isAdding] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      const result = await addDatHostServer(formData);
      return {
        error: 'error' in result ? (result.error as string) : undefined,
        success: 'success' in result && result.success,
      };
    },
    null,
  );

  const [removeState, setRemoveState] = useState<{ id: string; error?: string } | null>(null);

  async function handleRemove(id: string) {
    if (!confirm('Bu sunucuyu silmek istediğinize emin misiniz?')) return;
    const result = await removeDatHostServer(id);
    if ('error' in result) {
      setRemoveState({ id, error: result.error as string });
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
      >
        {t.serverManagement}
        <span className="text-[var(--color-text-muted)]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-[var(--color-border)] px-4 py-4 space-y-4">
          {/* Add Server Form */}
          <form action={addAction} className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{t.serverId}</label>
              <input
                name="dathost_server_id"
                required
                placeholder="abc123..."
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{t.serverName}</label>
              <input
                name="name"
                required
                placeholder="EU-1"
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="rounded bg-[#FF4D00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF6B2C] disabled:opacity-50"
            >
              {isAdding ? '...' : t.addServer}
            </button>
          </form>

          {addState?.error && typeof addState.error === 'string' && (
            <p className="text-sm text-red-400">{addState.error}</p>
          )}
          {addState?.success && (
            <p className="text-sm text-green-400">Sunucu eklendi</p>
          )}

          {/* Server List */}
          {servers.length > 0 && (
            <div className="space-y-2">
              {servers.map((server) => {
                const statusColor = DATHOST_SERVER_STATUS_COLORS[server.server_status] || '';
                const statusLabel = t.serverStatus[server.server_status as keyof typeof t.serverStatus] || server.server_status;
                return (
                  <div
                    key={server.id}
                    className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text-primary)]">{server.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">{server.dathost_server_id.slice(0, 8)}...</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(server.id)}
                      disabled={server.server_status === 'IN_MATCH'}
                      className="text-xs text-[var(--color-text-muted)] hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Sil
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {removeState?.error && (
            <p className="text-sm text-red-400">{removeState.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
