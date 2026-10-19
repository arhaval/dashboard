import Link from 'next/link';
import { buildTodaySignals, type TodaySignal } from './today.constants';
import type { ContentQueueItem } from './icerik-plani/content-queue.constants';
import type { WorkItem } from '@/types';

const TONE_STYLES: Record<TodaySignal['tone'], { color: string; bg: string; border: string }> = {
  LATE: { color: 'var(--color-error)',   bg: 'var(--color-error-muted)',   border: 'var(--color-error)' },
  WARN: { color: 'var(--color-warning)', bg: 'var(--color-warning-muted)', border: 'var(--color-warning)' },
  OK:   { color: 'var(--color-text-primary)', bg: 'var(--color-bg-secondary)', border: 'var(--color-border)' },
};

/**
 * Ana sayfanın en üstü: "bugün ne var".
 *
 * Her kutu tıklanır ve işin yapıldığı yere götürür. Hiç sinyal yoksa kutu
 * dizmek yerine tek satır yazar — boş kutular "her şey yolunda"yı gürültüyle
 * anlatmaktan iyidir.
 */
export function TodayPanel({
  workItems,
  content,
}: {
  workItems: WorkItem[];
  content: ContentQueueItem[];
}) {
  const signals = buildTodaySignals({ workItems, content });

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Bugün</h2>

      {signals.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Bekleyen iş yok. Takılan içerik, onay bekleyen iş ve ödenecek bir şey görünmüyor.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => {
            const tone = TONE_STYLES[s.tone];
            return (
              <Link
                key={s.key}
                href={s.href}
                className="rounded-[var(--radius-lg)] px-4 py-3 transition-colors hover:border-[var(--color-border-hover)]"
                style={{ backgroundColor: tone.bg, border: `1px solid ${tone.border}` }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-mono text-xl font-semibold" style={{ color: tone.color }}>
                    {s.count}
                  </span>
                  <span className="text-sm font-medium" style={{ color: tone.color }}>
                    {s.label}
                  </span>
                </div>
                {s.detail && (
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{s.detail}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
