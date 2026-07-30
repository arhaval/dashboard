'use client';

/**
 * YouTube geçmiş ölçüm noktalarını geri doldurma — tek seferlik bakım işlemi.
 *
 * İki adımlı bilerek: ilk tıklama HİÇBİR ŞEY YAZMAZ, yalnızca ne üretileceğini
 * gösterir. Kullanıcı gördüğünü onaylarsa ikinci adımda gerçekten yazılır.
 * Geçmişe veri yazan bir işlemin körlemesine tetiklenmemesi gerekir.
 */

import { useState, useTransition } from 'react';
import { History } from 'lucide-react';
import { backfillYoutubeCheckpoints } from './perf-actions';

interface Result {
  publications?: number;
  snapshotsWritten?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
}

export function BackfillButton() {
  const [preview, setPreview] = useState<Result | null>(null);
  const [applied, setApplied] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function run(dryRun: boolean) {
    startTransition(async () => {
      const res = await backfillYoutubeCheckpoints(dryRun);
      if (dryRun) setPreview(res);
      else { setApplied(res); setPreview(null); }
    });
  }

  const shown = applied ?? preview;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => { setApplied(null); run(true); }}
        disabled={pending}
        title="YouTube Analytics günlük geçmişinden 24s/7g/30g noktalarını geriye dönük kurar. Instagram’da bu mümkün değildir."
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
      >
        <History className="h-3.5 w-3.5" />
        {pending ? 'Çalışıyor…' : 'Geçmişi geri doldur'}
      </button>

      {shown && (
        <div
          className="rounded-[var(--radius-md)] p-3 text-[12px]"
          style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
        >
          {shown.error ? (
            <p style={{ color: 'var(--color-error)' }}>{shown.error}</p>
          ) : (
            <>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {applied ? 'Yazıldı: ' : 'Önizleme (hiçbir şey yazılmadı): '}
                <b style={{ color: 'var(--color-text-primary)' }}>{shown.snapshotsWritten ?? 0}</b> ölçüm noktası
                {' · '}{shown.publications ?? 0} bağlı YouTube yayını taranıyor
                {(shown.skipped ?? 0) > 0 && ` · ${shown.skipped} atlandı (zaten var ya da o nokta henüz gelmedi)`}
              </p>

              {(shown.errors?.length ?? 0) > 0 && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer" style={{ color: 'var(--color-warning)' }}>
                    {shown.errors?.length} video için hata
                  </summary>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {shown.errors?.map((e) => (
                      <li key={e} className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}

              {!applied && (shown.snapshotsWritten ?? 0) > 0 && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => run(false)}
                    disabled={pending}
                    className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    Uygula
                  </button>
                  <button
                    onClick={() => setPreview(null)}
                    className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                  >
                    Vazgeç
                  </button>
                </div>
              )}

              {!applied && (shown.snapshotsWritten ?? 0) === 0 && (shown.errors?.length ?? 0) === 0 && (
                <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Kurulabilecek yeni ölçüm noktası yok — ya hepsi zaten var ya da videolar henüz o yaşa gelmedi.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
