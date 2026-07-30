/**
 * Entegrasyon sağlığı — SAF katman (tipler, eşikler, hata sınıflandırması).
 *
 * Neden var: YouTube yetkisi 23 gün boyunca sessizce kopuk kaldı ve kimse fark
 * etmedi, çünkü hatalar `catch {}` ile yutuluyordu ve hiçbir yerde "en son ne
 * zaman başarıyla senkronize oldu" kaydı tutulmuyordu.
 *
 * Buradaki tek kural: YETKİ HATASI ile SIRADAN HATA aynı şey değildir.
 * Desteklenmeyen tek bir Instagram metriği bağlantıyı "kopuk" göstermemeli;
 * `invalid_grant` ise ilk seferde göstermeli.
 *
 * NO server imports.
 */

import type { ContentPlatform } from '../icerik-plani/content-queue.constants';

/** Sağlık kaydı tutulan kaynaklar — bir platformun iki ucu ayrı bozulabilir. */
export type IntegrationSource =
  | 'YOUTUBE_DATA_API'
  | 'YOUTUBE_ANALYTICS_API'
  | 'INSTAGRAM_MEDIA'
  | 'INSTAGRAM_INSIGHTS';

export const INTEGRATION_SOURCES: IntegrationSource[] = [
  'YOUTUBE_DATA_API', 'YOUTUBE_ANALYTICS_API', 'INSTAGRAM_MEDIA', 'INSTAGRAM_INSIGHTS',
];

export const SOURCE_LABELS: Record<IntegrationSource, string> = {
  YOUTUBE_DATA_API: 'YouTube temel veri',
  YOUTUBE_ANALYTICS_API: 'YouTube Analytics',
  INSTAGRAM_MEDIA: 'Instagram gönderi',
  INSTAGRAM_INSIGHTS: 'Instagram insights',
};

export const SOURCE_PLATFORM: Record<IntegrationSource, ContentPlatform> = {
  YOUTUBE_DATA_API: 'YOUTUBE',
  YOUTUBE_ANALYTICS_API: 'YOUTUBE',
  INSTAGRAM_MEDIA: 'INSTAGRAM',
  INSTAGRAM_INSIGHTS: 'INSTAGRAM',
};

export type HealthStatus = 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED' | 'REAUTH_REQUIRED';

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  CONNECTED: 'Bağlı',
  DEGRADED: 'Kısmi',
  DISCONNECTED: 'Kopuk',
  REAUTH_REQUIRED: 'Yeniden yetkilendirme gerekiyor',
};

/** Ciddiyet sırası — platform durumu en kötü kaynaktan türetilir. */
export const HEALTH_SEVERITY: Record<HealthStatus, number> = {
  CONNECTED: 0,
  DEGRADED: 1,
  DISCONNECTED: 2,
  REAUTH_REQUIRED: 3,
};

/**
 * Uyarı eşikleri — TEK YERDE. Cron 6 saatte bir çalıştığı için 12 saat iki
 * çalıştırma demektir; 24 saat dört.
 */
export const HEALTH_THRESHOLDS = {
  /** Bu kadar ardışık başarısızlıkta DEGRADED. Tek hata yalnızca loglanır. */
  degradedAfterFailures: 2,
  /** Bu süredir başarılı sync yoksa bayat sayılır. */
  staleAfterHours: 12,
  /** Bu süredir başarılı sync yoksa kritik. */
  criticalAfterHours: 24,
};

export interface IntegrationHealth {
  source: IntegrationSource;
  status: HealthStatus;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  consecutiveFailureCount: number;
  lastErrorCode: string | null;
  userSafeErrorMessage: string | null;
  requiresReauthorization: boolean;
  lastMetricsSourceDate: string | null;
}

// ── Hata sınıflandırması ─────────────────────────────────────────────────────

export type ErrorKind =
  /** Yetki geçersiz — yeniden bağlanmadan düzelmez. */
  | 'AUTH'
  /** Kaynak bu metriği/medyayı desteklemiyor — bağlantı SAĞLAM. */
  | 'UNSUPPORTED'
  /** Kota/hız sınırı — geçici. */
  | 'RATE_LIMIT'
  /** Yapılandırma eksik (ortam değişkeni). */
  | 'CONFIG'
  /** Diğer geçici/bilinmeyen hata. */
  | 'TRANSIENT';

export interface ClassifiedError {
  kind: ErrorKind;
  /** Teknik kod — log ve denetim için (invalid_grant gibi). */
  code: string;
  /** Kullanıcıya gösterilebilir metin. Stack trace ASLA. */
  userMessage: string;
  requiresReauthorization: boolean;
  /** Bu hata bağlantının KOPUK olduğu anlamına geliyor mu (yetki/yapılandırma). */
  isConnectionIssue: boolean;
  /**
   * Ardışık başarısızlık sayacına girer mi.
   *
   * Bağlantı sorunu olmasa da tekrarlayan geçici hata bir uyarı sebebidir —
   * ama beklenen durumlar (desteklenmeyen metrik, hız sınırı) sayaca girmez,
   * yoksa her sync'te DEGRADED uyarısı üretirdik.
   */
  countsAsFailure: boolean;
}

/** Google ve Meta'nın yetki hatası imzaları. */
const AUTH_PATTERNS = [
  'invalid_grant',
  'invalid_token',
  'unauthorized',
  'token has been expired',
  'token has been revoked',
  'refresh token',
  'access revoked',
  'authorization revoked',
  'session has been invalidated',
  'oauthexception',
  'yetki geçersiz',
  'yeniden bağlan',
];

const PERMISSION_PATTERNS = [
  'permission',
  'insufficient',
  'not authorized',
  'scope',
];

const UNSUPPORTED_PATTERNS = [
  'does not support',
  'not available for',
  'must be one of',
  'should not be queried',
  'unsupported',
];

const RATE_PATTERNS = ['rate limit', 'quota', 'too many requests', 'ratelimit'];

const CONFIG_PATTERNS = ['tanımlı değil', 'env eksik', 'oauth ayarı eksik'];

function has(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Bir hata metnini sınıflandır.
 *
 * DİKKAT: sıra önemli. "does not support the follows metric" içinde
 * "not support" geçer ama bu bir yetki sorunu DEĞİLDİR — desteklenmeyen metrik
 * kontrolü yetki kontrolünden ÖNCE yapılır.
 */
export function classifyIntegrationError(message: string): ClassifiedError {
  const m = (message ?? '').toLowerCase();

  if (has(m, UNSUPPORTED_PATTERNS)) {
    return {
      kind: 'UNSUPPORTED',
      code: 'unsupported_metric',
      userMessage: 'Bu platform istenen metriği desteklemiyor; diğer metrikler alındı.',
      requiresReauthorization: false,
      isConnectionIssue: false,
      countsAsFailure: false,
    };
  }
  if (has(m, CONFIG_PATTERNS)) {
    return {
      kind: 'CONFIG',
      code: 'config_missing',
      userMessage: 'Bağlantı ayarı eksik. Ortam değişkenlerinin tanımlanması gerekiyor.',
      requiresReauthorization: false,
      isConnectionIssue: true,
      countsAsFailure: true,
    };
  }
  if (has(m, AUTH_PATTERNS)) {
    const code = AUTH_PATTERNS.find((p) => m.includes(p)) ?? 'auth_error';
    return {
      kind: 'AUTH',
      code,
      userMessage: 'Yetki geçersiz. Platformu yeniden bağlaman gerekiyor.',
      requiresReauthorization: true,
      isConnectionIssue: true,
      countsAsFailure: true,
    };
  }
  if (has(m, PERMISSION_PATTERNS)) {
    return {
      kind: 'AUTH',
      code: 'permission_missing',
      userMessage: 'Gerekli izin verilmemiş. Yeniden yetkilendirme gerekiyor.',
      requiresReauthorization: true,
      isConnectionIssue: true,
      countsAsFailure: true,
    };
  }
  if (has(m, RATE_PATTERNS)) {
    return {
      kind: 'RATE_LIMIT',
      code: 'rate_limited',
      userMessage: 'Platform hız sınırına takıldı; bir sonraki denemede tekrar alınacak.',
      requiresReauthorization: false,
      isConnectionIssue: false,
      countsAsFailure: false,
    };
  }
  return {
    kind: 'TRANSIENT',
    code: 'transient_error',
    userMessage: 'Geçici bir hata alındı; bir sonraki denemede tekrar denenecek.',
    requiresReauthorization: false,
    isConnectionIssue: false,
    // Tek seferlik geçici hata sorun değil, ama üst üste geliyorsa uyarılmalı.
    countsAsFailure: true,
  };
}

/**
 * Bir kaynağın yeni durumunu hesapla — SAF fonksiyon.
 *
 * Kurallar:
 *  - başarı her şeyi sıfırlar
 *  - yetki hatası İLK seferde REAUTH_REQUIRED (beklemenin anlamı yok)
 *  - desteklenmeyen metrik durumu HİÇ bozmaz
 *  - sıradan hata: tek seferde yalnızca sayaç artar, ikincide DEGRADED
 *  - uzun süredir başarı yoksa bayatlık ayrıca değerlendirilir
 */
export function nextHealth(
  current: IntegrationHealth | null,
  outcome:
    | { ok: true; at: string; dataThroughDate?: string | null }
    | { ok: false; at: string; error: string; dataThroughDate?: string | null }
): IntegrationHealth {
  const base: IntegrationHealth = current ?? {
    source: 'YOUTUBE_DATA_API',
    status: 'CONNECTED',
    lastSuccessfulSyncAt: null,
    lastAttemptAt: null,
    consecutiveFailureCount: 0,
    lastErrorCode: null,
    userSafeErrorMessage: null,
    requiresReauthorization: false,
    lastMetricsSourceDate: null,
  };

  if (outcome.ok) {
    return {
      ...base,
      status: 'CONNECTED',
      lastSuccessfulSyncAt: outcome.at,
      lastAttemptAt: outcome.at,
      consecutiveFailureCount: 0,
      lastErrorCode: null,
      userSafeErrorMessage: null,
      requiresReauthorization: false,
      lastMetricsSourceDate: outcome.dataThroughDate ?? base.lastMetricsSourceDate,
    };
  }

  const classified = classifyIntegrationError(outcome.error);

  // Beklenen durumlar (desteklenmeyen metrik, hız sınırı) durumu bozmaz ve
  // sayacı artırmaz. Yalnızca son hata bilgisi olarak kaydedilir.
  if (!classified.countsAsFailure) {
    return {
      ...base,
      lastAttemptAt: outcome.at,
      lastErrorCode: classified.code,
      userSafeErrorMessage: classified.userMessage,
      lastMetricsSourceDate: outcome.dataThroughDate ?? base.lastMetricsSourceDate,
    };
  }

  const failures = base.consecutiveFailureCount + 1;
  const status: HealthStatus = classified.requiresReauthorization
    ? 'REAUTH_REQUIRED'
    : failures >= HEALTH_THRESHOLDS.degradedAfterFailures
      ? 'DEGRADED'
      : base.status === 'CONNECTED' ? 'CONNECTED' : base.status;

  return {
    ...base,
    status,
    lastAttemptAt: outcome.at,
    consecutiveFailureCount: failures,
    lastErrorCode: classified.code,
    userSafeErrorMessage: classified.userMessage,
    requiresReauthorization: classified.requiresReauthorization,
    // Başarısız denemede eski başarı zamanı ve veri tarihi KORUNUR — hata
    // yüzünden daha önce alınmış geçerli bilgi silinmez.
    lastSuccessfulSyncAt: base.lastSuccessfulSyncAt,
    lastMetricsSourceDate: base.lastMetricsSourceDate,
  };
}

/** Son başarılı sync üzerinden bayatlık. */
export function stalenessHours(health: IntegrationHealth, now: Date = new Date()): number | null {
  if (!health.lastSuccessfulSyncAt) return null;
  return (now.getTime() - new Date(health.lastSuccessfulSyncAt).getTime()) / 3_600_000;
}

export interface PlatformHealth {
  platform: ContentPlatform;
  status: HealthStatus;
  sources: IntegrationHealth[];
  /** Kullanıcıya gösterilecek tek cümle. Sağlıklıysa null. */
  warning: string | null;
  requiresReauthorization: boolean;
  lastSuccessfulSyncAt: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'hiç';
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Kaynak sağlıklarından platform durumu türet.
 *
 * Bir platformun bir ucu çalışıp diğeri çalışmıyorsa durum DEGRADED'dir —
 * "kopuk" demek yanlış olur, temel veri gelmeye devam ediyor.
 */
export function derivePlatformHealth(
  platform: ContentPlatform,
  sources: IntegrationHealth[],
  now: Date = new Date()
): PlatformHealth {
  const mine = sources.filter((s) => SOURCE_PLATFORM[s.source] === platform);
  if (mine.length === 0) {
    return { platform, status: 'CONNECTED', sources: [], warning: null, requiresReauthorization: false, lastSuccessfulSyncAt: null };
  }

  const worst = mine.reduce((a, b) => (HEALTH_SEVERITY[b.status] > HEALTH_SEVERITY[a.status] ? b : a));
  const healthy = mine.filter((s) => s.status === 'CONNECTED');
  const broken = mine.filter((s) => s.status !== 'CONNECTED');

  const lastSuccess = mine
    .map((s) => s.lastSuccessfulSyncAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop() ?? null;

  let status = worst.status;
  // Bazı uçlar çalışıyorsa "kopuk" değil "kısmi"dir.
  if (broken.length > 0 && healthy.length > 0 && status === 'DISCONNECTED') status = 'DEGRADED';

  let warning: string | null = null;
  if (status === 'REAUTH_REQUIRED') {
    const label = broken.map((s) => SOURCE_LABELS[s.source]).join(', ');
    warning = `${label} bağlantısı koptu. Son başarılı senkronizasyon: ${fmtDate(lastSuccess)}. Gelişmiş performans metrikleri güncellenemiyor.`;
  } else if (status === 'DEGRADED') {
    const ok = healthy.map((s) => SOURCE_LABELS[s.source]).join(', ');
    const bad = broken.map((s) => SOURCE_LABELS[s.source]).join(', ');
    warning = healthy.length > 0
      ? `${ok} verileri geliyor ancak ${bad} metrikleri güncellenemiyor.`
      : `${bad} metrikleri güncellenemiyor.`;
  } else if (status === 'DISCONNECTED') {
    warning = `Bağlantı kurulamıyor. Son başarılı senkronizasyon: ${fmtDate(lastSuccess)}.`;
  } else {
    // Bağlıyken bile uzun süredir veri gelmiyorsa uyar.
    const stale = mine
      .map((s) => stalenessHours(s, now))
      .filter((h): h is number => h != null);
    const worstStale = stale.length > 0 ? Math.max(...stale) : null;
    if (worstStale != null && worstStale >= HEALTH_THRESHOLDS.criticalAfterHours) {
      warning = `${Math.round(worstStale)} saattir başarılı senkronizasyon yok. Son başarılı: ${fmtDate(lastSuccess)}.`;
      status = 'DEGRADED';
    } else if (worstStale != null && worstStale >= HEALTH_THRESHOLDS.staleAfterHours) {
      warning = `Veriler ${Math.round(worstStale)} saattir tazelenmedi.`;
    }
  }

  return {
    platform,
    status,
    sources: mine,
    warning,
    requiresReauthorization: mine.some((s) => s.requiresReauthorization),
    lastSuccessfulSyncAt: lastSuccess,
  };
}
