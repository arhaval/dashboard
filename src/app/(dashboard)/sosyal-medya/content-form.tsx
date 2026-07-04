'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CONTENT_FORMATS,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
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
  defaultDate?: string;
}

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as ContentPlatform[];
const ALL_STATUSES  = Object.keys(STATUS_LABELS) as ContentStatus[];

export function ContentForm({ open, onClose, item, defaultDate }: ContentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [platforms,    setPlatforms]    = useState<Set<ContentPlatform>>(new Set(['YOUTUBE']));
  const [contentType,  setContentType]  = useState('');
  const [title,        setTitle]        = useState('');
  const [status,       setStatus]       = useState<ContentStatus>('HAZIRLANIYOR');
  const [contentText,  setContentText]  = useState('');
  const [voiceUrl,     setVoiceUrl]     = useState('');
  const [videoUrl,     setVideoUrl]     = useState('');
  const [hasText,      setHasText]      = useState(false);
  const [hasVoice,     setHasVoice]     = useState(false);
  const [hasVideo,     setHasVideo]     = useState(false);
  const [plannedDate,  setPlannedDate]  = useState('');
  const [notes,        setNotes]        = useState('');

  useEffect(() => {
    if (item) {
      setPlatforms(new Set(item.platforms));
      setContentType(item.content_type);
      setTitle(item.title);
      setStatus(item.status);
      setContentText(item.content_text || '');
      setVoiceUrl(item.voice_url || '');
      setVideoUrl(item.video_url || '');
      setHasText(item.has_text);
      setHasVoice(item.has_voice);
      setHasVideo(item.has_video);
      setPlannedDate(item.planned_date || '');
      setNotes(item.notes || '');
    } else {
      setPlatforms(new Set(['YOUTUBE']));
      setContentType('');
      setTitle('');
      setStatus('HAZIRLANIYOR');
      setContentText('');
      setVoiceUrl('');
      setVideoUrl('');
      setHasText(false);
      setHasVoice(false);
      setHasVideo(false);
      setPlannedDate(defaultDate || '');
      setNotes('');
    }
    setError(null);
  }, [item, open, defaultDate]);

  function togglePlatform(p: ContentPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())        { setError('Başlık zorunludur.');          return; }
    if (platforms.size === 0) { setError('En az bir platform seçin.');   return; }
    if (!contentType)         { setError('Format seçimi zorunludur.');   return; }

    setError(null);
    startTransition(async () => {
      const payload = {
        title:        title.trim(),
        platforms:    Array.from(platforms),
        content_type: contentType,
        status,
        content_text: contentText.trim() || null,
        voice_url:    voiceUrl.trim()    || null,
        video_url:    videoUrl.trim()    || null,
        has_text:     hasText,
        has_voice:    hasVoice,
        has_video:    hasVideo,
        planned_date: plannedDate || null,
        notes:        notes.trim() || null,
      };
      const result = item
        ? await updateContentItem(item.id, payload)
        : await createContentItem(payload);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  if (!open) return null;

  const inputStyle = {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => { if (!isPending) onClose(); }} />

      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-md)]"
        style={{ backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {item ? 'İçeriği Düzenle' : 'Yeni İçerik Ekle'}
          </h3>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

            {/* Başlık */}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Başlık <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="İçerik başlığı" required />
            </div>

            {/* Platformlar */}
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Platformlar <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => {
                  const selected = platforms.has(p);
                  const colors   = PLATFORM_COLORS[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-all"
                      style={
                        selected
                          ? { backgroundColor: colors.bg, color: colors.color, border: `1.5px solid ${colors.color}` }
                          : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1.5px solid var(--color-border)' }
                      }
                    >
                      {selected ? '✓ ' : ''}{PLATFORM_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format + Tarih */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Format <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <Select value={contentType} onChange={(e) => setContentType(e.target.value)} required>
                  <option value="">Seçin</option>
                  {CONTENT_FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Planlı Yayın Tarihi
                </label>
                <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
              </div>
            </div>

            {/* İçerik Metni */}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                İçerik Metni / Script
              </label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="İçerik metni, script veya caption buraya yazılır…"
                rows={6}
                className="w-full resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            {/* Üretim Durumu */}
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Üretim Adımları
              </label>
              <div className="space-y-2">
                {[
                  { key: 'text',  label: 'Metin yazıldı',      state: hasText,  set: setHasText  },
                  { key: 'voice', label: 'Ses kaydedildi',     state: hasVoice, set: setHasVoice },
                  { key: 'video', label: 'Video hazırlandı',   state: hasVideo, set: setHasVideo },
                ].map(({ key, label, state, set }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={state}
                      onChange={(e) => set(e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-accent)]"
                    />
                    <span className="text-sm" style={{ color: state ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ses + Video Linkleri */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  🎙 Ses Linki
                </label>
                <Input
                  value={voiceUrl}
                  onChange={(e) => setVoiceUrl(e.target.value)}
                  placeholder="Drive, Dropbox vs. linki"
                  type="url"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  🎬 Video Linki
                </label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Drive, WeTransfer vs. linki"
                  type="url"
                />
              </div>
            </div>

            {/* Durum + Notlar */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Durum
                </label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Notlar
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ek notlar"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex flex-shrink-0 justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
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
