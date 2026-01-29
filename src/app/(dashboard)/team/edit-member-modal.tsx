'use client';

/**
 * Edit Member Modal
 * Admin-only form to edit team member details (contact, IBAN, etc.)
 */

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Phone, CreditCard, MapPin, FileText } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { updateTeamMember } from './actions';
import type { User } from '@/types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function EditMemberModal({ isOpen, onClose, user }: EditMemberModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    iban: '',
    bank_name: '',
    address: '',
    notes: '',
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        iban: user.iban || '',
        bank_name: user.bank_name || '',
        address: user.address || '',
        notes: user.notes || '',
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateTeamMember(user.id, {
        phone: formData.phone || null,
        iban: formData.iban || null,
        bank_name: formData.bank_name || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });

      if (!result.success) {
        setError(result.error || tr.messages.error.failedToSave);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {tr.team.editMember}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">{user.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-error-muted)] p-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-success-muted)] p-3 text-sm text-[var(--color-success)]">
            {tr.team.updateSuccess}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info Section */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <Phone className="h-4 w-4" />
              {tr.team.contactInfo}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.team.phone}
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={tr.team.phonePlaceholder}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.team.address}
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={tr.team.addressPlaceholder}
                  disabled={isPending}
                  rows={2}
                  className="flex w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Info Section */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <CreditCard className="h-4 w-4" />
              {tr.team.paymentInfo}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.team.iban}
                </label>
                <Input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => handleChange('iban', e.target.value)}
                  placeholder={tr.team.ibanPlaceholder}
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
                  {tr.team.bankName}
                </label>
                <Input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder={tr.team.bankNamePlaceholder}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <FileText className="h-4 w-4" />
              {tr.team.notes}
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={tr.team.notesPlaceholder}
              disabled={isPending}
              rows={3}
              className="flex w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              {tr.actions.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? tr.team.saving : tr.actions.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
