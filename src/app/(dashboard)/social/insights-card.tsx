/**
 * "Bu Ay Ne Oldu?" — en fazla 4 satır, her biri bir aksiyona bakar.
 *
 * Çerçevesiz bölüm: sayfadaki tek kutulu blok KPI'lar. Özneler serif
 * (okunacak bilgi), etiket ve detay sans.
 */

import type { Insight, InsightTone } from './social-overview.constants';
import { Amount, MicroLabel, Section } from './social-ui';

const TONE_COLOR: Record<InsightTone, string> = {
  POSITIVE: 'var(--color-success)',
  NEGATIVE: 'var(--color-error)',
  NEUTRAL: 'var(--color-warning)',
};

export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <Section title="Bu Ay Ne Oldu?">
      {insights.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
          Bu ay için öne çıkan bir hareket yok.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((i) => (
            <div key={`${i.title}-${i.subject}`}>
              <MicroLabel>{i.title}</MicroLabel>
              <div className="mt-1.5">
                <Amount size="sm" tone={TONE_COLOR[i.tone]}>{i.subject}</Amount>
              </div>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                {i.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
