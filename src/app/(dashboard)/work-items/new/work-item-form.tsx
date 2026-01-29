/**
 * Work Item Form Component
 * Client component for creating work items
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import type { WorkType, ContentLength } from '@/types';

type FormData = {
  work_type: WorkType;
  work_date: string;
  notes: string;
  // STREAM fields
  match_name: string;
  duration_minutes: string;
  // VOICE/EDIT fields
  content_name: string;
  content_length: ContentLength | '';
};

const initialFormData: FormData = {
  work_type: 'STREAM',
  work_date: new Date().toISOString().split('T')[0],
  notes: '',
  match_name: '',
  duration_minutes: '',
  content_name: '',
  content_length: '',
};

export function WorkItemForm() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.work_date) {
      newErrors.work_date = tr.work.workDateRequired;
    }

    if (formData.work_type === 'STREAM') {
      if (!formData.match_name.trim()) {
        newErrors.match_name = tr.work.matchNameRequired;
      }
      if (!formData.duration_minutes || parseInt(formData.duration_minutes) < 1) {
        newErrors.duration_minutes = tr.work.durationRequired;
      }
    }

    if (formData.work_type === 'VOICE' || formData.work_type === 'EDIT') {
      if (!formData.content_name.trim()) {
        newErrors.content_name = tr.work.contentNameRequired;
      }
      if (!formData.content_length) {
        newErrors.content_length = tr.work.contentLengthRequired;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setServerError(tr.messages.error.loginRequired);
        return;
      }

      // Prepare data based on work type
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        work_type: formData.work_type,
        work_date: formData.work_date,
        notes: formData.notes || null,
        status: 'DRAFT',
      };

      if (formData.work_type === 'STREAM') {
        insertData.match_name = formData.match_name;
        insertData.duration_minutes = parseInt(formData.duration_minutes);
      } else {
        insertData.content_name = formData.content_name;
        insertData.content_length = formData.content_length;
      }

      const { error } = await supabase.from('work_items').insert(insertData);

      if (error) {
        setServerError(error.message || tr.messages.error.failedToCreate);
        return;
      }

      // Success - redirect to work items list
      router.push('/work-items');
      router.refresh();
    } catch {
      setServerError(tr.messages.error.unexpected);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Error */}
          {serverError && (
            <div
              className={cn(
                'rounded-[var(--radius-md)]',
                'border border-[var(--color-error)]',
                'bg-[var(--color-error-muted)]',
                'px-4 py-3',
                'text-sm text-[var(--color-error)]'
              )}
            >
              {serverError}
            </div>
          )}

          {/* Work Type */}
          <div className="space-y-2">
            <Label htmlFor="work_type" required>
              {tr.work.workType}
            </Label>
            <select
              id="work_type"
              name="work_type"
              value={formData.work_type}
              onChange={handleChange}
              disabled={isLoading}
              className={cn(
                'flex h-10 w-full',
                'rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
                'px-3 py-2 text-sm',
                'text-[var(--color-text-primary)]',
                'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
              )}
            >
              <option value="STREAM">{tr.workItem.type.STREAM}</option>
              <option value="VOICE">{tr.workItem.type.VOICE}</option>
              <option value="EDIT">{tr.workItem.type.EDIT}</option>
            </select>
          </div>

          {/* Work Date */}
          <div className="space-y-2">
            <Label htmlFor="work_date" required>
              {tr.work.workDate}
            </Label>
            <Input
              id="work_date"
              name="work_date"
              type="date"
              value={formData.work_date}
              onChange={handleChange}
              error={!!errors.work_date}
              disabled={isLoading}
            />
            {errors.work_date && (
              <p className="text-sm text-[var(--color-error)]">{errors.work_date}</p>
            )}
          </div>

          {/* STREAM Fields */}
          {formData.work_type === 'STREAM' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="match_name" required>
                  {tr.work.matchName}
                </Label>
                <Input
                  id="match_name"
                  name="match_name"
                  placeholder={tr.work.matchNamePlaceholder}
                  value={formData.match_name}
                  onChange={handleChange}
                  error={!!errors.match_name}
                  disabled={isLoading}
                />
                {errors.match_name && (
                  <p className="text-sm text-[var(--color-error)]">{errors.match_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_minutes" required>
                  {tr.work.duration}
                </Label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  placeholder={tr.work.durationPlaceholder}
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  error={!!errors.duration_minutes}
                  disabled={isLoading}
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-[var(--color-error)]">
                    {errors.duration_minutes}
                  </p>
                )}
              </div>
            </>
          )}

          {/* VOICE/EDIT Fields */}
          {(formData.work_type === 'VOICE' || formData.work_type === 'EDIT') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="content_name" required>
                  {tr.work.contentName}
                </Label>
                <Input
                  id="content_name"
                  name="content_name"
                  placeholder={tr.work.contentNamePlaceholder}
                  value={formData.content_name}
                  onChange={handleChange}
                  error={!!errors.content_name}
                  disabled={isLoading}
                />
                {errors.content_name && (
                  <p className="text-sm text-[var(--color-error)]">{errors.content_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_length" required>
                  {tr.work.contentLength}
                </Label>
                <select
                  id="content_length"
                  name="content_length"
                  value={formData.content_length}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={cn(
                    'flex h-10 w-full',
                    'rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
                    'px-3 py-2 text-sm',
                    'text-[var(--color-text-primary)]',
                    errors.content_length
                      ? 'border-[var(--color-error)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
                  )}
                >
                  <option value="">{tr.work.selectLength}</option>
                  <option value="SHORT">{tr.workItem.contentLength.SHORT}</option>
                  <option value="LONG">{tr.workItem.contentLength.LONG}</option>
                </select>
                {errors.content_length && (
                  <p className="text-sm text-[var(--color-error)]">
                    {errors.content_length}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{tr.work.notesOptional}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder={tr.work.notesPlaceholder}
              value={formData.notes}
              onChange={handleChange}
              disabled={isLoading}
              className={cn(
                'flex w-full',
                'rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
                'px-3 py-2 text-sm',
                'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                'resize-none'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" isLoading={isLoading} disabled={isLoading}>
              {tr.work.createItem}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              {tr.actions.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
