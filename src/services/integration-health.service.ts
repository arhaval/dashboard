/**
 * Entegrasyon sağlığı — okuma/yazma katmanı.
 *
 * Her sync denemesi buraya yazılır. Amaç tek: bir platform bozulduğunda bunun
 * SESSİZCE geçmesini engellemek. Karar mantığı saf katmanda
 * (integration-health.constants.ts), burada yalnızca kalıcılık var.
 *
 * Tablo henüz migrate edilmemişse bütün metotlar sessizce boş döner — sağlık
 * kaydı tutulamaması, asıl senkronizasyonu düşürmek için bir sebep değildir.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  derivePlatformHealth,
  nextHealth,
  INTEGRATION_SOURCES,
  type IntegrationHealth,
  type IntegrationSource,
  type PlatformHealth,
} from '@/app/(dashboard)/icerik-performansi/integration-health.constants';
import type { ContentPlatform } from '@/app/(dashboard)/icerik-plani/content-queue.constants';

interface HealthRow {
  source: string;
  status: string;
  last_successful_sync_at: string | null;
  last_attempt_at: string | null;
  consecutive_failure_count: number;
  last_error_code: string | null;
  user_safe_error_message: string | null;
  requires_reauthorization: boolean;
  last_metrics_source_date: string | null;
}

function toHealth(row: HealthRow): IntegrationHealth {
  return {
    source: row.source as IntegrationSource,
    status: row.status as IntegrationHealth['status'],
    lastSuccessfulSyncAt: row.last_successful_sync_at,
    lastAttemptAt: row.last_attempt_at,
    consecutiveFailureCount: row.consecutive_failure_count ?? 0,
    lastErrorCode: row.last_error_code,
    userSafeErrorMessage: row.user_safe_error_message,
    requiresReauthorization: Boolean(row.requires_reauthorization),
    lastMetricsSourceDate: row.last_metrics_source_date,
  };
}

export const integrationHealthService = {
  async getAll(): Promise<IntegrationHealth[]> {
    const admin = createAdminClient();
    const { data, error } = await admin.from('integration_health').select('*');
    if (error || !data) return [];
    return (data as HealthRow[]).map(toHealth);
  },

  /** Platform bazında durum + kullanıcıya gösterilecek uyarı. */
  async getPlatformHealth(): Promise<PlatformHealth[]> {
    const sources = await this.getAll();
    if (sources.length === 0) return [];
    return (['YOUTUBE', 'INSTAGRAM'] as ContentPlatform[]).map((p) =>
      derivePlatformHealth(p, sources)
    );
  },

  /**
   * Bir sync denemesinin sonucunu kaydet.
   *
   * Başarısızlıkta önceki başarı zamanı ve veri tarihi KORUNUR — hata, daha
   * önce doğrulanmış bilgiyi silmek için sebep değildir.
   */
  async record(
    source: IntegrationSource,
    outcome:
      | { ok: true; dataThroughDate?: string | null }
      | { ok: false; error: string; dataThroughDate?: string | null }
  ): Promise<void> {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('integration_health').select('*').eq('source', source).maybeSingle();
      const current = data ? toHealth(data as HealthRow) : null;
      const at = new Date().toISOString();

      const next = nextHealth(
        current ? { ...current, source } : null,
        outcome.ok ? { ok: true, at, dataThroughDate: outcome.dataThroughDate }
                   : { ok: false, at, error: outcome.error, dataThroughDate: outcome.dataThroughDate }
      );

      await admin.from('integration_health').upsert({
        source,
        status: next.status,
        last_successful_sync_at: next.lastSuccessfulSyncAt,
        last_attempt_at: next.lastAttemptAt,
        consecutive_failure_count: next.consecutiveFailureCount,
        last_error_code: next.lastErrorCode,
        user_safe_error_message: next.userSafeErrorMessage,
        requires_reauthorization: next.requiresReauthorization,
        last_metrics_source_date: next.lastMetricsSourceDate,
        updated_at: at,
      }, { onConflict: 'source' });
    } catch {
      // Sağlık kaydı tutamamak asıl işi düşürmez. Yine de sessiz kalmasın:
      console.error(`[integration-health] ${source} durumu kaydedilemedi`);
    }
  },

  /** Hiç kayıt yoksa kaynakları CONNECTED olarak başlat (ilk kurulum). */
  async seedIfEmpty(): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return;
    const admin = createAdminClient();
    await admin.from('integration_health').upsert(
      INTEGRATION_SOURCES.map((source) => ({ source, status: 'CONNECTED', consecutive_failure_count: 0 })),
      { onConflict: 'source' }
    );
  },
};
