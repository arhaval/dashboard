'use client';

/**
 * Team Grid
 * Client component: renders team members as cards with role/status controls,
 * detail/edit/delete actions. (File name kept for import stability.)
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Pencil, Phone, CreditCard, Eye, Trash2, Mail, CalendarDays, AlertTriangle } from 'lucide-react';
import { StatusControl } from './member-actions';
import { EditMemberModal } from './edit-member-modal';
import { AddMemberButton } from './add-member-button';
import { deleteTeamMember } from './actions';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

function roleAccent(role: string): string {
  switch (role) {
    case 'ADMIN':     return 'var(--color-accent)';
    case 'PUBLISHER': return 'var(--color-info)';
    case 'EDITOR':    return 'var(--color-success)';
    case 'VOICE':     return 'var(--color-warning)';
    case 'GRAFIKER':  return '#F97316';
    default:          return 'var(--color-text-muted)';
  }
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMIN':     return 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]';
    case 'PUBLISHER': return 'bg-[var(--color-info-muted)] text-[var(--color-info)]';
    case 'EDITOR':    return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    case 'VOICE':     return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]';
    case 'GRAFIKER':  return 'bg-orange-500/15 text-orange-500';
    default:          return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Delete confirmation modal ───────────────────────────────────────────────

function DeleteMemberModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTeamMember(user.id);
      if (!result.success) {
        setError(result.error || 'Silme başarısız');
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0B1437]/50 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div
        className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(11,20,55,0.25)',
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error-muted)]">
            <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Üyeyi Sil</h3>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">{user.full_name}</span> kalıcı olarak silinecek.
          Bu işlem geri alınamaz ve kişinin <span className="font-medium">tüm iş kayıtları, ödemeleri ve avansları</span> da silinir.
        </p>

        {error && (
          <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-error-muted)] p-2.5 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            İptal
          </Button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Siliniyor…' : 'Kalıcı Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Member card ─────────────────────────────────────────────────────────────

interface MemberCardProps {
  user: User;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function MemberCard({ user, isCurrentUser, isAdmin, onEdit, onDelete }: MemberCardProps) {
  const accent = roleAccent(user.role);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Accent strip */}
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />

      <div className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: accent, border: `1.5px solid ${accent}` }}
          >
            {initials(user.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-[var(--color-text-primary)]">{user.full_name}</p>
              {isCurrentUser && (
                <span className="rounded-full bg-[var(--color-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                  {tr.team.you}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--color-text-muted)]">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        {/* Role + Status controls */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Rol</p>
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-1 text-xs font-semibold',
                roleBadgeClass(user.role)
              )}
            >
              {tr.roles[user.role as keyof typeof tr.roles] || user.role}
            </span>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Durum</p>
            {isAdmin ? (
              <StatusControl userId={user.id} isActive={user.is_active} isCurrentUser={isCurrentUser} />
            ) : (
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                  user.is_active
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                )}
              >
                {user.is_active ? tr.team.active : tr.team.inactive}
              </span>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(user.created_at)}
          </span>
          {user.phone && (
            <span className="flex items-center gap-1 text-[var(--color-success)]" title={user.phone}>
              <Phone className="h-3 w-3" /> Tel
            </span>
          )}
          {user.iban && (
            <span className="flex items-center gap-1 text-[var(--color-info)]" title="IBAN kayıtlı">
              <CreditCard className="h-3 w-3" /> IBAN
            </span>
          )}
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--color-border)] pt-3">
            <Link
              href={`/team/${user.id}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <Eye className="h-3.5 w-3.5" /> Detay
            </Link>
            <button
              onClick={onEdit}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              title={tr.team.editMember}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {!isCurrentUser && (
              <button
                onClick={onDelete}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-muted)]"
                title="Üyeyi sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────

interface TeamTableProps {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

export function TeamTable({ users, currentUserId, isAdmin }: TeamTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  if (users.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
        <p>{tr.team.noMembers}</p>
        {isAdmin && <AddMemberButton />}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((user) => (
          <MemberCard
            key={user.id}
            user={user}
            isCurrentUser={user.id === currentUserId}
            isAdmin={isAdmin}
            onEdit={() => setEditingUser(user)}
            onDelete={() => setDeletingUser(user)}
          />
        ))}
      </div>

      <EditMemberModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        isSelf={editingUser?.id === currentUserId}
      />

      {deletingUser && (
        <DeleteMemberModal user={deletingUser} onClose={() => setDeletingUser(null)} />
      )}
    </>
  );
}
