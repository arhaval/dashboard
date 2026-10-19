'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { STATUS_LABELS, type ContentStatus } from './content-queue.constants';

const ALL_STATUSES = Object.keys(STATUS_LABELS) as ContentStatus[];

export interface ContentDetails {
  hasText: boolean;
  hasVoice: boolean;
  hasVideo: boolean;
  voiceUrl: string;
  videoUrl: string;
  status: ContentStatus;
  notes: string;
}

export const EMPTY_DETAILS: ContentDetails = {
  hasText: false,
  hasVoice: false,
  hasVideo: false,
  voiceUrl: '',
  videoUrl: '',
  status: 'HAZIRLANIYOR',
  notes: '',
};

/**
 * Formun "çoğu zaman gerekmeyen" kısmı: üretim adımları, teslim linkleri,
 * durum, not. Kapalı başlar.
 *
 * Normal akışta bunlara dokunulmaz — hat kendi yürütür: metin + seslendiren
 * seçilince adım Ses'e geçer, linkler ilgili kişinin kendi teslimiyle dolar.
 * Burada durmaları elle düzeltme içindir (geçmiş bir kartı doğru duruma
 * çekmek, yanlış yapıştırılmış linki değiştirmek).
 */
export function ContentDetailsSection({
  value,
  onChange,
  /** Seslendiren seçildi: "Metin yazıldı" otomatik işaretlenir, elle değişmez. */
  textAuto,
}: {
  value: ContentDetails;
  onChange: (patch: Partial<ContentDetails>) => void;
  textAuto: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const steps = [
    { key: 'hasText'  as const, label: 'Metin yazıldı',    locked: textAuto },
    { key: 'hasVoice' as const, label: 'Ses kaydedildi',   locked: false },
    { key: 'hasVideo' as const, label: 'Video hazırlandı', locked: false },
  ];

  return (
    <div className="rounded-[var(--radius-sm)] border" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2.5 text-xs font-semibold"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        />
        Detaylar — üretim adımları, teslim linkleri, durum, not
      </button>

      {open && (
        <div className="space-y-4 border-t px-3 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Üretim Adımları
            </label>
            <div className="space-y-2">
              {steps.map(({ key, label, locked }) => {
                const checked = locked ? true : value[key];
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 ${locked ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={(e) => onChange({ [key]: e.target.checked })}
                      className="h-4 w-4 rounded accent-[var(--color-accent)]"
                    />
                    <span
                      className="text-sm"
                      style={{ color: checked ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                    >
                      {label}
                      {locked && ' — seslendirmene gönderiliyor'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                🎙 Ses Linki
              </label>
              <Input
                value={value.voiceUrl}
                onChange={(e) => onChange({ voiceUrl: e.target.value })}
                placeholder="Drive, Dropbox vs. linki"
                type="url"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                🎬 Video Linki
              </label>
              <Input
                value={value.videoUrl}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="Drive, WeTransfer vs. linki"
                type="url"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Durum
              </label>
              <Select
                value={value.status}
                onChange={(e) => onChange({ status: e.target.value as ContentStatus })}
              >
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
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Ek notlar"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
