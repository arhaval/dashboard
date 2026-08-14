/**
 * "Bu Ay Ne Oldu?" — en fazla 4 satır.
 *
 * Eskiden burada üç uzun metin bloğu vardı (ne yaptın / nasıl gitti / nerede
 * yükseliyorsun). Aynı bilgi artık başlık + özne + tek satır detay olarak
 * duruyor: okuması saniyeler sürüyor ve her satır bir aksiyona bakıyor.
 */

import type { Insight, InsightTone } from './social-overview.constants';

const TONE_COLOR: Record<InsightTone, string> = {
  POSITIVE: 'var(--color-success)',
  NEGATIVE: 'var(--color-error)',
  NEUTRAL: 'var(--color-warning)',
};

export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <section
      className="rounded-[var(--radius-md)] p-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Bu Ay Ne Oldu?
      </h3>

      {insights.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Bu ay için öne çıkan bir hareket yok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((i) => (
            <div key={`${i.title}-${i.subject}`}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                {i.title}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold leading-tight" style={{ color: TONE_COLOR[i.tone] }}>
                {i.subject}
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                {i.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
