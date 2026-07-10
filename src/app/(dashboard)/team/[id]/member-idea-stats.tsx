import { Lightbulb } from 'lucide-react';
import { LABEL_META } from '../../icerik-performansi/perf.constants';
import { PLATFORM_LABELS, PLATFORM_COLORS, type ContentPlatform } from '../../icerik-plani/content-queue.constants';
import type { AuthorIdeaStat } from '@/services/idea.service';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return String(n);
}

export function MemberIdeaStats({ stats }: { stats: AuthorIdeaStat[] }) {
  const published = stats.filter((s) => s.outcome);
  const totalViews = published.reduce((sum, s) => sum + (s.outcome?.total_views ?? 0), 0);

  if (stats.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border p-6 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Henüz içeriğe dönüşmüş bir fikir yok.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <b style={{ color: 'var(--color-text-primary)' }}>{stats.length}</b> fikri içeriğe dönüştü
          </span>
        </div>
        {published.length > 0 && (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Toplam <b className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{fmt(totalViews)}</b> izlenme
          </span>
        )}
      </div>

      {/* Per idea */}
      {stats.map((s) => (
        <div key={s.id} className="rounded-[var(--radius-md)] border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.title}</span>
            {s.outcome?.label && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: LABEL_META[s.outcome.label].bg, color: LABEL_META[s.outcome.label].color }}>
                {LABEL_META[s.outcome.label].text}
              </span>
            )}
            {s.outcome && s.outcome.total_views > 0 && (
              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {fmt(s.outcome.total_views)} izlenme
              </span>
            )}
          </div>

          {s.outcome ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.outcome.platforms.map((pl) => {
                const key = pl.platform as ContentPlatform;
                const c = PLATFORM_COLORS[key];
                const bits = [
                  pl.views != null ? `${fmt(pl.views)} izlenme` : null,
                  pl.likes != null ? `${fmt(pl.likes)} beğeni` : null,
                ].filter(Boolean).join(' · ');
                const inner = (
                  <>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: c.bg, color: c.color }}>{PLATFORM_LABELS[key]}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{bits || 'veri bekleniyor'}</span>
                  </>
                );
                return pl.url ? (
                  <a key={pl.platform} href={pl.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                    {inner}
                  </a>
                ) : (
                  <span key={pl.platform} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                    {inner}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              İçerik üretimde — yayınlanınca istatistikler burada görünecek.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
