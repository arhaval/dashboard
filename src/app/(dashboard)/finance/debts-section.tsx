/**
 * Borç / Alacak — "kime borçluyuz" ve "bize kim borçlu" yan yana.
 * Henüz deftere girmemiş yükümlülükler; kâr/zararı çift saymaz.
 */

import Link from 'next/link';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SectionHead } from '@/components/dashboard/widgets';
import { TR_MONTHS, shortDate } from '@/components/dashboard/utils';
import type { Payables, Receivables } from '@/services/finance-overview.service';
import { CollectClientButton, SponsorDueButtons, ExpectedIncomeButton } from './receivable-actions';

const CARD = 'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]';
const ROW = 'flex items-center gap-3 px-4 py-3';

const monthName = (m: string) => {
  const [y, mm] = m.split('-').map(Number);
  return `${TR_MONTHS[mm - 1]} ${y}`;
};

function CardHead({ title, total, tone, href, hrefLabel }: { title: string; total: number; tone: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3.5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" style={{ color: tone }}>{formatCurrency(total)}</p>
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          {hrefLabel} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function GroupLabel({ children, amount }: { children: React.ReactNode; amount?: number }) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)]/50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
      <span>{children}</span>
      {amount != null && <span className="tabular-nums">{formatCurrency(amount)}</span>}
    </div>
  );
}

function PayablesCard({ p }: { p: Payables }) {
  const total = p.totalReady + p.totalAwaiting + p.totalPlanned;
  return (
    <div className={CARD}>
      <CardHead title="Kime borçluyuz" total={total} tone="var(--color-error)" href="/payments" hrefLabel="Ödemelere git" />
      {p.people.length === 0 && p.planned.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Bekleyen borç yok.</p>
      ) : (
        <>
          {p.people.length > 0 && (
            <>
              <GroupLabel amount={p.totalReady + p.totalAwaiting}>Ekip hak edişleri</GroupLabel>
              <ul className="divide-y divide-[var(--color-border)]">
                {p.people.map((x) => (
                  <li key={x.userId} className={ROW}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{x.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-[var(--color-text-muted)]">
                        {x.readyCount > 0 && <span className="text-[var(--color-warning)]">{x.readyCount} iş ödemeye hazır</span>}
                        {x.awaitingCount > 0 && <span>{x.awaitingCount} onay bekliyor ({formatCurrency(x.awaiting)})</span>}
                        {x.unpricedCount > 0 && <span className="text-[var(--color-error)]">{x.unpricedCount} ücretsiz</span>}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {/* Yalnızca ücretsiz işi varsa ₺0 yanıltıcı — tutar henüz bilinmiyor */}
                      {x.ready + x.awaiting > 0 ? formatCurrency(x.ready + x.awaiting) : '—'}
                    </span>
                  </li>
                ))}
              </ul>
              {p.totalUnpriced > 0 && (
                <Link href="/work-items?status=DRAFT" className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-2.5 text-xs text-[var(--color-warning)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {p.totalUnpriced} işin ücreti belirlenmemiş — borç bu tutardan fazla olabilir
                </Link>
              )}
            </>
          )}
          {p.planned.length > 0 && (
            <>
              <GroupLabel amount={p.totalPlanned}>Planlanan giderler</GroupLabel>
              <ul className="divide-y divide-[var(--color-border)]">
                {p.planned.map((e) => (
                  <li key={e.id} className={ROW}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-primary)]">{e.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Vade {shortDate(e.dueDate)}</p>
                    </div>
                    <span className="text-sm tabular-nums text-[var(--color-text-primary)]">{formatCurrency(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReceivablesCard({ r }: { r: Receivables }) {
  const total = r.totalClients + r.totalSponsors + r.totalExpected;
  return (
    <div className={CARD}>
      <CardHead title="Bize kim borçlu" total={total} tone="var(--color-success)" href="/nakit" hrefLabel="Nakit akışı" />
      {!r.collectionsReady && (
        <p className="border-b border-[var(--color-border)] bg-[var(--color-warning-muted)] px-4 py-2 text-xs text-[var(--color-warning)]">
          Dış ortak tahsilatı için 20261129 migration&apos;ı uygulanmalı.
        </p>
      )}
      {r.clients.length === 0 && r.sponsors.length === 0 && r.expected.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Bekleyen alacak yok.</p>
      ) : (
        <>
          {r.clients.length > 0 && (
            <>
              <GroupLabel amount={r.totalClients}>Ekstra işler (dış ortak)</GroupLabel>
              <ul className="divide-y divide-[var(--color-border)]">
                {r.clients.map((c) => (
                  <li key={`${c.clientId}-${c.month}`} className={`${ROW} flex-wrap`}>
                    <div className="min-w-0 flex-1">
                      <Link href={`/ekstra-isler/${c.clientId}?ay=${c.month}`} className="truncate text-sm font-medium text-[var(--color-text-primary)] hover:underline">
                        {c.clientName} · {monthName(c.month)}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {c.itemCount} iş{c.collected > 0 ? ` · ${formatCurrency(c.collected)} tahsil edildi` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(c.outstanding)}</span>
                    {r.collectionsReady && <CollectClientButton clientId={c.clientId} month={c.month} amount={c.outstanding} />}
                  </li>
                ))}
              </ul>
            </>
          )}
          {r.sponsors.length > 0 && (
            <>
              <GroupLabel amount={r.totalSponsors}>Sponsor taksitleri</GroupLabel>
              <ul className="divide-y divide-[var(--color-border)]">
                {r.sponsors.map((s) => (
                  <li key={s.id} className={`${ROW} flex-wrap`}>
                    <div className="min-w-0 flex-1">
                      <Link href={`/sponsorluklar/${s.sponsorId}`} className="truncate text-sm font-medium text-[var(--color-text-primary)] hover:underline">
                        {s.sponsorName} · {s.label}
                      </Link>
                      <p className={`mt-0.5 text-xs ${s.overdue ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}`}>
                        {s.dueDate ? `${s.overdue ? 'Gecikti · ' : 'Vade '}${shortDate(s.dueDate)}` : 'Vade yok'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(s.amount)}</span>
                    <SponsorDueButtons paymentId={s.id} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {r.expected.length > 0 && (
            <>
              <GroupLabel amount={r.totalExpected}>Beklenen gelirler</GroupLabel>
              <ul className="divide-y divide-[var(--color-border)]">
                {r.expected.map((e) => (
                  <li key={e.id} className={`${ROW} flex-wrap`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--color-text-primary)]">{e.title}</p>
                      <p className={`mt-0.5 text-xs ${e.overdue ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'}`}>
                        {e.overdue ? 'Gecikti · ' : ''}{shortDate(e.expectedDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(e.amount)}</span>
                    <ExpectedIncomeButton id={e.id} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function DebtsSection({ payables, receivables }: { payables: Payables; receivables: Receivables }) {
  return (
    <section>
      <SectionHead title="Borç / Alacak" chip="Şu an" />
      <div className="grid gap-3 lg:grid-cols-2">
        <PayablesCard p={payables} />
        <ReceivablesCard r={receivables} />
      </div>
    </section>
  );
}
