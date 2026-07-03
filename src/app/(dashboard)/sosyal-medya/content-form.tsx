'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CONTENT_TYPES,
  PLATFORM_LABELS,
  STATUS_LABELS,
  type ContentQueueItem,
  type ContentPlatform,
  type ContentStatus,
} from './content-queue.constants';
import { createContentItem, updateContentItem } from './queue-actions';

interface ContentFormProps {
  open: boolean;
  onClose: () => void;
  item?: ContentQueueItem | null;
}

const PLATFORMS = Object.keys(PLATFORM_LABELS) as ContentPlatform[];
const STATUSES  = Object.keys(STATUS_LABELS)  as ContentStatus[];

export function ContentForm({ open, onClose, item }: ContentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [platform,    setPlatform]    = useState<ContentPlatform>('YOUTUBE');
  const [contentType, setContentType] = useState('');
  const [title,       setTitle]       = useState('');
  const [status,      setStatus]      = useState<ContentStatus>('HAZIRLANIYOR');
  const [plannedDate, setPlannedDate] = useState('');
  const [notes,       setNotes]       = useState('');

  useEffect(() => {
    if (item) {
      setPlatform(item.platform);
      setContentType(item.content_type);
      setTitle(item.title);
      setStatus(item.status);
      setPlannedDate(item.planned_date || '');
      setNotes(item.notes || '');
    } else {
      setPlatform('YOUTUBE');
      setContentType('');
      setTitle('');
      setStatus('HAZIRLANIYOR');
      setPlannedDate('');
      setNotes('');
    }
    setError(null);
  }, [item, open]);

  useEffect(() => {
    if (!item) setContentType('');
  }, [platform, item]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !contentType) {
      setError('Başlık ve tür zorunludur.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        platform,
        content_type: contentType,
        status,
        planned_date: plannedDate || null,
        notes: notes.trim() || null,
      };
      const result = item
        ? await updateContentItem(item.id, payload)
        : await createContentItem(payload);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => { if (!isPending) onClose(); }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-[var(--radius-md)] p-6"
        style={{ backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="mb-5 text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {item ? 'İçeriği Düzenle' : 'Yeni İçerik Ekle'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform + Tür */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Platform
              </label>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Tür <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <Select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                required
              >
                <option value="">Seçin</option>
                {CONTENT_TYPES[platform].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Başlık */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Başlık <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="İçerik başlığı"
              required
            />
          </div>

          {/* Durum + Tarih */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Durum
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Planlı Yayın Tarihi
              </label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="İçerik hakkında notlar (opsiyonel)"
              rows={3}
              className="w-full resize-none rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : item ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
