/**
 * MemberProfileCard
 * Displays the profile header, stats summary, and contact/payment info
 * for a team member. Server component.
 */

import { cn, formatDate, formatCurrency, getRoleBadgeClass } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import {
  Phone,
  CreditCard,
  MapPin,
  Mail,
  FileText,
  Building2,
} from 'lucide-react';
import type { User, UserRole } from '@/types';

// =============================================================================
// InfoCard (private helper)
// =============================================================================

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  emptyText: string;
}

function InfoCard({ icon, label, value, emptyText }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="text-[var(--color-text-muted)]">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className={cn(
          'mt-1 text-sm',
          value ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] italic'
        )}>
          {value || emptyText}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Stats
// =============================================================================

interface UserStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

// =============================================================================
// MemberProfileCard
// =============================================================================

export interface MemberProfileCardProps {
  member: User;
  stats: UserStats;
}

export function MemberProfileCard({ member, stats }: MemberProfileCardProps) {
  const initials = member.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Profile Header */}
      <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div
            className={cn(
              'flex h-20 w-20 items-center justify-center',
              'rounded-full bg-[var(--color-bg-tertiary)]',
              'text-2xl font-semibold text-[var(--color-text-primary)]'
            )}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {member.full_name}
              </h2>
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1',
                  'text-sm font-medium',
                  getRoleBadgeClass(member.role as UserRole)
                )}
              >
                {tr.roles[member.role as keyof typeof tr.roles] || member.role}
              </span>
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1',
                  'text-sm font-medium',
                  member.is_active
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                )}
              >
                {member.is_active ? tr.team.active : tr.team.inactive}
              </span>
            </div>
            <p className="mt-1 text-[var(--color-text-muted)]">{member.email}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {tr.team.joined}: {formatDate(member.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Toplam İşlem</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {stats.transactionCount}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">{tr.transaction.type.INCOME}</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">
            {formatCurrency(stats.totalIncome)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">{tr.transaction.type.EXPENSE}</p>
          <p className="text-2xl font-semibold text-[var(--color-error)]">
            {formatCurrency(stats.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Net Bakiye</p>
          <p className={cn(
            'text-2xl font-semibold',
            stats.netBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
          )}>
            {formatCurrency(stats.netBalance)}
          </p>
        </div>
      </div>

      {/* Contact & Payment Info */}
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          {tr.team.contactInfo} & {tr.team.paymentInfo}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<Phone className="h-5 w-5" />}
            label={tr.team.phone}
            value={member.phone}
            emptyText={tr.team.noPhone}
          />
          <InfoCard
            icon={<Mail className="h-5 w-5" />}
            label={tr.team.email}
            value={member.email}
            emptyText="\u2014"
          />
          <InfoCard
            icon={<CreditCard className="h-5 w-5" />}
            label={tr.team.iban}
            value={member.iban}
            emptyText={tr.team.noIban}
          />
          <InfoCard
            icon={<Building2 className="h-5 w-5" />}
            label={tr.team.bankName}
            value={member.bank_name}
            emptyText="\u2014"
          />
          <InfoCard
            icon={<MapPin className="h-5 w-5" />}
            label={tr.team.address}
            value={member.address}
            emptyText={tr.team.noAddress}
          />
          <InfoCard
            icon={<FileText className="h-5 w-5" />}
            label={tr.team.notes}
            value={member.notes}
            emptyText={tr.team.noNotes}
          />
        </div>
      </div>
    </>
  );
}
