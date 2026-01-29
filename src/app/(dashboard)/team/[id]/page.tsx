/**
 * Team Member Profile Page
 * Shows detailed information about a team member
 * Admin-only access
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { userService, financeService } from '@/services';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import {
  ArrowLeft,
  Phone,
  CreditCard,
  MapPin,
  Mail,
  Calendar,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
} from 'lucide-react';
import type { Transaction, User } from '@/types';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

function getRoleBadgeStyles(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]';
    case 'PUBLISHER':
      return 'bg-[var(--color-info-muted)] text-[var(--color-info)]';
    case 'EDITOR':
      return 'bg-[var(--color-success-muted)] text-[var(--color-success)]';
    case 'VOICE':
      return 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]';
    default:
      return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  }
}

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

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
        Bu kullanıcıya ait işlem bulunamadı
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.type}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.date}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.category}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.description}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {tr.transaction.fields.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 10).map((transaction, index) => (
            <tr
              key={transaction.id}
              className={cn(
                'border-b border-[var(--color-border)] last:border-b-0',
                index % 2 === 0
                  ? 'bg-[var(--color-table-row-even)]'
                  : 'bg-[var(--color-table-row-odd)]'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {transaction.type === 'INCOME' ? (
                    <ArrowUpCircle className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-[var(--color-error)]" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      transaction.type === 'INCOME'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-error)]'
                    )}
                  >
                    {transaction.type === 'INCOME'
                      ? tr.transaction.type.INCOME
                      : tr.transaction.type.EXPENSE}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {formatDate(transaction.transaction_date)}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                {transaction.category}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                {transaction.description || '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={cn(
                    'font-mono text-sm font-medium',
                    transaction.type === 'INCOME'
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-error)]'
                  )}
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const { id } = await params;

  // Get current user and verify admin access
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/team');
  }

  // Get the team member
  const member = await userService.getById(id);

  if (!member) {
    notFound();
  }

  // Get transactions and stats for this user
  const [transactions, stats] = await Promise.all([
    financeService.getByUserId(id),
    financeService.getUserStats(id),
  ]);

  return (
    <PageShell
      title={tr.team.memberDetails}
      description={member.full_name}
      actions={
        <Link href="/team">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tr.actions.back}
          </Button>
        </Link>
      }
    >
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
            {member.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
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
                  getRoleBadgeStyles(member.role)
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
            emptyText="—"
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
            emptyText="—"
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

      {/* Recent Transactions */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          Son İşlemler
        </h3>
        <RecentTransactions transactions={transactions} />
      </div>
    </PageShell>
  );
}
