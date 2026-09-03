import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { isUntagged, listFinalScripts } from '@/services/ai-classify.service';
import { MotorTabs } from '../motor-tabs';
import { countByFormat } from './learning.constants';
import { SignalList } from './signal-list';
import { TagBackfillButton } from './tag-backfill-button';

export const dynamic = 'force-dynamic';

export default async function OgrenmePage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/motor');

  const [{ signals, error }, finals] = await Promise.all([
    aiEngineService.listEditSignals(),
    listFinalScripts(),
  ]);
  const counts = countByFormat(signals);
  const untagged = finals.filter(isUntagged).length;

  return (
    <PageShell
      title="Öğrenme"
      description="Onaylanan her finalde AI'ın ham çıktısı, senin onayladığın hâli ve gerekçen birlikte saklanır. Amaç: motorun neyi tekrar tekrar yanlış yaptığını görmek."
    >
      <MotorTabs />

      <section className="mb-6">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Etiketleme
        </h2>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Onaylanan metinler otomatik etiketlenir. Bu düğme yalnızca etiketi eksik kalmış eski
          finaller içindir; onay akışını çalıştırmaz, öğrenme sinyali yazmaz.
        </p>
        <TagBackfillButton untagged={untagged} />
      </section>

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-error)] px-4 py-3 text-sm text-[var(--color-error)]">
          Sinyaller okunamadı: {error}
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Format bazında biriken sinyal
            </h2>
            {counts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Henüz sinyal yok.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {counts.map((c) => (
                  <div
                    key={c.formatId ?? 'none'}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3"
                  >
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{c.label}</p>
                    <p className="mt-1 font-mono text-2xl tabular-nums text-[var(--color-text-primary)]">
                      {c.count}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {c.withReason} tanesinde gerekçe var
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Sinyaller ({signals.length})
            </h2>
            <SignalList signals={signals} />
          </section>
        </div>
      )}
    </PageShell>
  );
}
