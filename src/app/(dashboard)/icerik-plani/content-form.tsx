'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  CONTENT_FORMATS,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  decideHandoff,
  type ContentQueueItem,
  type ContentPlatform,
} from './content-queue.constants';
import { ContentDetailsSection, EMPTY_DETAILS, type ContentDetails } from './content-form-details';
import { createContentItem, updateContentItem } from './queue-actions';

interface ContentFormProps {
  open: boolean;
  onClose: () => void;
  item?: ContentQueueItem | null;
  defaultDate?: string;
  /** Seslendirebilecek kişiler — boşsa kişi seçimi gösterilmez. */
  voicePeople?: { id: string; name: string }[];
}

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as ContentPlatform[];

/**
 * Yeni içerik: metni yaz, seslendireni seç, gönder.
 *
 * Eskiden iki adımdı — kartı kaydet, sonra panoda kişiyi seçip "Metin Tamam"a
 * bas. Kişi seçimi forma geldi: metin + kişi doluysa kart doğrudan "Ses
 * Bekleniyor"da açılır ve o kişiye bildirim gider. Çoğu zaman gerekmeyen
 * alanlar (üretim adımları, teslim linkleri, durum, not) Detaylar'da kapalı.
 */
export function ContentForm({ open, item, ...rest }: ContentFormProps) {
  // Kapalıyken gövde hiç kurulmaz; açıldığında ya da başka bir karta
  // geçildiğinde `key` yüzünden sıfırdan kurulur. Böylece alanları efekt
  // içinde elle sıfırlamak gerekmiyor — her açılış zaten temiz başlıyor.
  if (!open) return null;
  return <ContentFormBody key={item?.id ?? 'new'} item={item} {...rest} />;
}

function ContentFormBody({
  onClose,
  item,
  defaultDate,
  voicePeople = [],
}: Omit<ContentFormProps, 'open'>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title,       setTitle]       = useState(item?.title ?? '');
  const [contentText, setContentText] = useState(item?.content_text ?? '');
  const [assignee,    setAssignee]    = useState(item?.assigned_to ?? '');
  const [platforms,   setPlatforms]   = useState<Set<ContentPlatform>>(
    () => new Set(item ? item.platforms : ['YOUTUBE'])
  );
  const [contentType, setContentType] = useState(item?.content_type ?? '');
  const [plannedDate, setPlannedDate] = useState(item?.planned_date ?? defaultDate ?? '');
  const [details,     setDetails]     = useState<ContentDetails>(() =>
    item
      ? {
          hasText:  item.has_text,
          hasVoice: item.has_voice,
          hasVideo: item.has_video,
          voiceUrl: item.voice_url || '',
          videoUrl: item.video_url || '',
          status:   item.status,
          notes:    item.notes || '',
        }
      : EMPTY_DETAILS
  );

  function togglePlatform(p: ContentPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  // Düğme metni ve "gönderilecek mi" kararı sunucuyla aynı saf fonksiyondan.
  const handoff = decideHandoff({
    text: contentText,
    assigneeId: assignee,
    hasTextChecked: details.hasText,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())        { setError('Başlık zorunludur.');        return; }
    if (platforms.size === 0) { setError('En az bir platform seçin.'); return; }
    if (!contentType)         { setError('Format seçimi zorunludur.'); return; }
    if (handoff.blocked === 'NO_TEXT') {
      setError('Seslendirmeye göndermek için metni de yaz.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const payload = {
        title:        title.trim(),
        platforms:    Array.from(platforms),
        content_type: contentType,
        status:       details.status,
        content_text: contentText.trim() || null,
        voice_url:    details.voiceUrl.trim() || null,
        video_url:    details.videoUrl.trim() || null,
        has_text:     handoff.hasText,
        has_voice:    details.hasVoice,
        has_video:    details.hasVideo,
        planned_date: plannedDate || null,
        notes:        details.notes.trim() || null,
        assigned_to:  handoff.assignedTo,
      };
      const result = item
        ? await updateContentItem(item.id, payload)
        : await createContentItem(payload);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const submitLabel = item
    ? 'Güncelle'
    : handoff.notify
      ? '🎙 Seslendirmeye Gönder'
      : 'Kaydet';

  const assigneeHint = handoff.notify
    ? 'Kaydedince metin bu kişiye gider ve bildirim alır.'
    : handoff.blocked === 'NO_TEXT'
      ? 'Metin boş — göndermek için yukarıya metni yaz.'
      : 'Boş bırakırsan kart taslak kalır, kimseye gitmez.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!isPending) onClose(); }}
      />

      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          backgroundColor: 'var(--color-surface-3)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 60px rgba(11,20,55,0.25)',
        }}
      >
        <div className="flex-shrink-0 border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {item ? 'İçeriği Düzenle' : 'Yeni İçerik'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Başlık <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="İçerik başlığı" required />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Metin
              </label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Seslendirilecek metni buraya yaz…"
                rows={12}
                className="w-full resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            {voicePeople.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  🎙 Seslendirecek kişi
                </label>
                <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">— Şimdi göndermeyeceğim —</option>
                  {voicePeople.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {assigneeHint}
                </p>
              </div>
            )}

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
                Planlanan yayın tarihi
              </label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Takip listesi bu tarihe göre sıralanır. Boş bırakırsan kart listenin sonuna düşer.
              </p>
            </div>

            <ContentDetailsSection
              value={details}
              onChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
              textAuto={handoff.notify}
            />

            {error && (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}
          </div>

          <div
            className="flex flex-shrink-0 justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kaydediliyor…' : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
