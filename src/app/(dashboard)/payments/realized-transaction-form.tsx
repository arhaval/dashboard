'use client';

/**
 * Realized Transaction Form
 * Form to add manual income/expense transactions
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { Plus, X } from 'lucide-react';
import { createRealizedTransaction } from './realized-actions';
import type { User, TransactionType } from '@/types';

interface RealizedTransactionFormProps {
  users: User[];
}

const EXPENSE_CATEGORIES = [
  { value: 'Ekip Ödemeleri', label: tr.transaction.categories.teamPayments },
  { value: 'Avanslar', label: tr.transaction.categories.advances },
  { value: 'Operasyon', label: tr.transaction.categories.operations },
  { value: 'Ekipman', label: tr.transaction.categories.equipment },
  { value: 'Diğer', label: tr.transaction.categories.other },
];

const INCOME_CATEGORIES = [
  { value: 'Sponsorluk', label: tr.transaction.categories.sponsorship },
  { value: 'Reklam Gelirleri', label: tr.transaction.categories.ads },
  { value: 'Diğer', label: tr.transaction.categories.other },
];

export function RealizedTransactionForm({ users }: RealizedTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [userId, setUserId] = useState('');

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const resetForm = () => {
    setType('EXPENSE');
    setCategory('');
    setAmount('');
    setDescription('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setUserId('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!category || !amount || !transactionDate) {
      setError(tr.messages.error.validation);
      return;
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('category', category);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('transaction_date', transactionDate);
    if (userId) {
      formData.append('user_id', userId);
    }

    startTransition(async () => {
      const result = await createRealizedTransaction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        resetForm();
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {tr.payment.realized.addTransaction}
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
          {tr.payment.realized.addTransaction}
        </h3>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type & Category Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
              {tr.transaction.fields.type}
            </label>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TransactionType);
                setCategory(''); // Reset category when type changes
              }}
            >
              <option value="EXPENSE">{tr.transaction.type.EXPENSE}</option>
              <option value="INCOME">{tr.transaction.type.INCOME}</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
              {tr.transaction.fields.category}
            </label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">{tr.filter.allCategories}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Amount & Date Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
              {tr.transaction.fields.amount} (₺)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
              {tr.transaction.fields.date}
            </label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* User Selection (Optional) */}
        <div>
          <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
            {tr.payment.realized.userOptional}
          </label>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{tr.payment.realized.selectUser}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </Select>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
            {tr.transaction.fields.description}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr.work.notesPlaceholder}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? tr.team.saving : tr.actions.save}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
          >
            {tr.actions.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}
