'use client';

/**
 * "Eksik Verileri Tamamla" — adım adım, platform platform.
 *
 * Neden dev bir form değil: 7 platform × ~6 alan = 40 kutuluk bir form
 * kullanıcıyı ilk bakışta kaybettiriyor. Burada her adımda TEK platform var ve
 * yalnızca EKSİK alanlar soruluyor — dolu olan bir metrik bir daha sorulmuyor.
 *
 * Otomatik gelmesi gereken alanlar adımlarda YER ALMAZ: onları elle doldurmak
 * entegrasyon sorununu gizler, bir sonraki senkronda da üzerine yazılır.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Plug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformTag } from '../social-ui';
import { monthLabel, type MonthCompleteness, type PlatformCompleteness } from '../social-monthly.constants';
import { saveMissingMetrics } from './wizard-actions';

export function CompletionWizard({
  completeness,
  onClose,
}: {
  completeness: MonthCompleteness;
  onClose: () => void;
}) {
  const router = useRouter();

  // Yalnızca ELLE doldurulabilir eksiği olan platformlar adım olur.
  const steps = useMemo(
    () => completeness.platforms.filter((p) => p.fields.some((f) => !f.filled && f.source === 'MANUAL')),
    [completeness]
  );

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const step: PlatformCompleteness | undefined = steps[index];
  const done = index >= steps.length;

  function save() {
    if (!step) return;
    setError(null);
    start(async () => {
      const res = await saveMissingMetrics(completeness.month, step.platform, values);
      if (!res.success) {
        setError(res.error ?? 'Kaydedilemedi');
        return;
      }
      setValues({});
      setIndex((i) => i + 1);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && onClose()} />

      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-[var(--radius-lg)] sm:p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {done ? `${monthLabel(completeness.month)} tamamlandı` : 'Eksik Verileri Tamamla'}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {done
                ? 'Elle girilmesi gereken alan kalmadı.'
                : `${monthLabel(completeness.month)} · adım ${index + 1}/${steps.length}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }} aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <Finished month={completeness.month} onClose={onClose} />
        ) : step ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <PlatformTag platform={step.platform} strong />
              <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                {step.pendingManualFields.length} alan eksik
              </span>
            </div>

            <div className="space-y-2.5">
              {step.fields
                .filter((f) => !f.filled && f.source === 'MANUAL')
                .map((f) => (
                  <label key={f.name} className="block">
                    <span className="mb-1 block text-[11.5px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {f.label}
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      className="w-full rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </label>
                ))}
            </div>

            {step.brokenApiFields.length > 0 && (
              <p className="mt-3 flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--color-error)' }}>
                <Plug className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>
                  {step.brokenApiFields.join(', ')} otomatik gelmeli — elle girilmiyor. Veri Kaynakları bölümünden
                  bağlantıyı kontrol et.
                </span>
              </p>
            )}

            <p className="mt-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Bilmediğin alanı boş bırak; sonra tamamlayabilirsin.
            </p>

            {error && <p className="mt-2 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

            <div className="mt-4 flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setIndex((i) => i + 1)} disabled={isPending}>
                Atla
              </Button>
              <Button type="button" onClick={save} disabled={isPending}>
                {isPending ? 'Kaydediliyor…' : index === steps.length - 1 ? 'Kaydet ve Bitir' : 'Kaydet ve Devam Et'}
                {!isPending && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
              </Button>
            </div>
          </>
        ) : (
          <Finished month={completeness.month} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function Finished({ month, onClose }: { month: string; onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="py-2">
      <p className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
        <Check className="h-4 w-4" />
        {monthLabel(month)} için elle giriş tamam.
      </p>
      <Button
        type="button"
        onClick={() => {
          onClose();
          router.push(`/social?month=${month}`);
        }}
      >
        Aylık Raporu Gör
      </Button>
    </div>
  );
}
