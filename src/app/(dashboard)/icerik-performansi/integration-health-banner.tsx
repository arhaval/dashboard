'use client';

/**
 * Platform bağlantı durumu.
 *
 * Sağlıklıyken küçük bir satır ("YouTube · Bağlı · son sync 14:05"), sorun
 * varsa kapatılabilir ama kaybolmayan bir uyarı. Amaç: YouTube'un 23 gün
 * boyunca sessizce kopuk kalması bir daha yaşanmasın.
 *
 * Kapatma yalnızca o oturum için gizler; sayfa yenilenince tekrar görünür —
 * çözülmemiş bir bağlantı sorunu kalıcı olarak susturulamamalı.
 */

import { useState } from 'react';
import { AlertTriangle, Check, ExternalLink, X } from 'lucide-react';
import {
  HEALTH_LABELS,
  type HealthStatus,
  type PlatformHealth,
} from './integration-health.constants';
import { PLATFORM_LABELS } from '../icerik-plani/content-queue.constants';

/** Platform → yeniden yetkilendirme akışı. */
const RECONNECT_URL: Record<string, string> = {
  YOUTUBE: '/api/youtube/oauth/start',
  INSTAGRAM: '/api/instagram/oauth/start',
};

const STATUS_STYLE: Record<HealthStatus, { bg: string; color: string }> = {
  CONNECTED: { bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  DEGRADED: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
  DISCONNECTED: { bg: 'var(--color-error-muted)', color: 'var(--color-error)' },
  REAUTH_REQUIRED: { bg: 'var(--color-error-muted)', color: 'var(--color-error)' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return 'hiç';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function IntegrationHealthBanner({ health }: { health: PlatformHealth[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (health.length === 0) return null;

  const problems = health.filter((h) => h.warning && !dismissed.includes(h.platform));
  const healthy = health.filter((h) => !h.warning);

  return (
    <div className="mb-4 flex flex-col gap-2">
      {problems.map((h) => {
        const style = STATUS_STYLE[h.status];
        return (
          <div
            key={h.platform}
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] p-3"
            style={{ backgroundColor: style.bg, border: `1px solid ${style.color}` }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: style.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold" style={{ color: style.color }}>
                {PLATFORM_LABELS[h.platform]} · {HEALTH_LABELS[h.status]}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {h.warning}
              </p>
              {h.requiresReauthorization && RECONNECT_URL[h.platform] && (
                <a
                  href={RECONNECT_URL[h.platform]}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {PLATFORM_LABELS[h.platform]}’u Yeniden Bağla
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => setDismissed((d) => [...d, h.platform])}
              aria-label="Gizle"
              title="Bu oturum için gizle — sorun çözülmediyse yenilemede tekrar görünür"
              className="rounded p-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* Sağlıklıyken büyük banner yok — tek satır durum göstergesi yeter. */}
      {healthy.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {healthy.map((h) => (
            <span
              key={h.platform}
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--color-text-muted)' }}
              title={`Son başarılı senkronizasyon: ${h.lastSuccessfulSyncAt ?? 'hiç'}`}
            >
              <Check className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
              {PLATFORM_LABELS[h.platform]} · Bağlı · son sync {fmtTime(h.lastSuccessfulSyncAt)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
