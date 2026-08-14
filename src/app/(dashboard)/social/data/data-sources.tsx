/**
 * Veri Kaynakları — hangi platform otomatik geliyor, hangisi elle.
 *
 * Otomatik platformlarda son senkronizasyon zamanı gösterilir: "veri neden
 * eksik" sorusunun cevabı çoğu zaman burada.
 *
 * "Geçmişi Doldur" gibi ağır işlemler bu bölümde DEĞİL, Gelişmiş İşlemler'de:
 * günlük akışta lazım olmuyorlar ve yanlışlıkla tetiklenmeleri istenmiyor.
 */

import { MONTHLY_PLATFORMS, type MonthlyPlatform } from '../social-monthly.constants';
import { PlatformTag } from '../social-ui';

/** API entegrasyonu olan platformlar. */
const AUTOMATIC: MonthlyPlatform[] = ['YOUTUBE', 'INSTAGRAM'];

export interface SourceStatus {
  platform: MonthlyPlatform;
  connected: boolean;
  lastSyncAt: string | null;
  /** Bağlantı sorunluysa tek cümlelik sebep. */
  detail?: string | null;
}

function fmtWhen(iso: string | null): string {
  if (!iso) return 'hiç senkronize edilmedi';
  return `son senkron: ${new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })}`;
}

export function DataSources({ statuses }: { statuses: SourceStatus[] }) {
  const byPlatform = new Map(statuses.map((s) => [s.platform, s]));

  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Veri Kaynakları
      </h3>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {MONTHLY_PLATFORMS.map((platform) => {
          const automatic = AUTOMATIC.includes(platform);
          const status = byPlatform.get(platform);
          const connected = automatic && Boolean(status?.connected);

          return (
            <div
              key={platform}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2"
              style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
            >
              <PlatformTag platform={platform} strong />

              <div className="ml-auto text-right">
                {automatic ? (
                  <>
                    <span
                      className="text-[11.5px] font-semibold"
                      style={{ color: connected ? 'var(--color-success)' : 'var(--color-error)' }}
                    >
                      {connected ? '🟢 Bağlı' : '🔴 Bağlı değil'}
                    </span>
                    <p className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      {status?.detail ?? fmtWhen(status?.lastSyncAt ?? null)}
                    </p>
                  </>
                ) : (
                  <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                    ⚪ Manuel
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
