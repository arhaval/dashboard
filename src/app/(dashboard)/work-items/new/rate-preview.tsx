'use client';

/**
 * Ücret önizlemesi — iş girerken "bu iş için ne alacağım" sorusunu kayıttan
 * ÖNCE cevaplar. Ücret tanımlı değilse açıkça uyarır; böylece iş sessizce
 * ₺0 ile girilmez. Hesap sunucuda (previewWorkItemRate) yapılır, yalnızca
 * kişinin kendi ücreti döner.
 */

import * as React from 'react';
import { AlertTriangle, Coins } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ContentLength, WorkType } from '@/types';
import { previewWorkItemRate, type RatePreview as Preview } from './actions';

const DEBOUNCE_MS = 300;

interface RatePreviewProps {
  workType: WorkType;
  clientId: string;
  clientName?: string;
  mapCount: number | null;
  contentLength: ContentLength | null;
}

export function RatePreview({ workType, clientId, clientName, mapCount, contentLength }: RatePreviewProps) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Yayında harita, diğerlerinde uzunluk seçilmeden fiyat anlamlı değil.
  const ready = !!clientId && (workType === 'STREAM' ? !!mapCount && mapCount > 0 : !!contentLength);

  React.useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      previewWorkItemRate({
        work_type: workType,
        client_id: clientId || null,
        map_count: mapCount,
        content_length: contentLength,
      })
        .then((p) => {
          if (!cancelled) setPreview(p);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, workType, clientId, mapCount, contentLength]);

  if (!ready) {
    return (
      <Box tone="muted" icon={<Coins className="h-4 w-4" />}>
        {!clientId
          ? 'Kimin için yaptığını seçince alacağın ücret burada görünür.'
          : workType === 'STREAM'
            ? 'Harita sayısını girince alacağın ücret burada görünür.'
            : 'Uzunluğu seçince alacağın ücret burada görünür.'}
      </Box>
    );
  }

  if (loading && !preview) {
    return (
      <Box tone="muted" icon={<Coins className="h-4 w-4" />}>
        Ücret hesaplanıyor…
      </Box>
    );
  }

  if (!preview || preview.amount == null) {
    return (
      <Box tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
        <span className="font-medium">
          {clientName ? `${clientName} için` : 'Bu iş için'} ücretin tanımlı değil.
        </span>{' '}
        Kaydedebilirsin; ücreti admin onayda belirleyecek ve sana bildirim gelecek.
      </Box>
    );
  }

  return (
    <Box tone="success" icon={<Coins className="h-4 w-4" />}>
      <span className="text-[var(--color-text-secondary)]">Bu iş için alacağın: </span>
      <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
        {formatCurrency(preview.amount)}
      </span>
      {workType === 'STREAM' && preview.perMap != null && mapCount && (
        <span className="ml-1.5 font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
          ({mapCount} harita × {formatCurrency(preview.perMap)})
        </span>
      )}
      <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
        Admin onayladıktan sonra ödemeye hazır olur.
      </span>
    </Box>
  );
}

const TONES = {
  muted: 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]',
  warning: 'border-[var(--color-warning)]/40 bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  success: 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-success)]',
} as const;

function Box({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-3 text-sm ${TONES[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
