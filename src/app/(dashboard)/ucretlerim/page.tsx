/**
 * Ücretlerim — admin dışı kullanıcının kendi fiyat kartı (salt okunur).
 * Girilen işin ücreti bu fiyatlardan otomatik hesaplanır; kullanıcı doğruluğunu
 * buradan kontrol eder. Yalnızca KENDİ hak edişi görünür — müşteriye kesilen
 * tutar (bill_amount) ve Arhaval'in kârı burada asla gösterilmez.
 */

import { redirect } from 'next/navigation';
import { Coins as PageIcon, Radio, Mic, Scissors, Info } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { rateCardService } from '@/services/rate-card.service';
import { LedgerList, type LedgerRow } from '@/components/dashboard/ledger-list';
import { formatCurrency, getWorkTypeLabel, getContentLengthLabel } from '@/lib/utils';
import type { RateCard, WorkType } from '@/types';

export const dynamic = 'force-dynamic';

const TYPE_ICON: Record<WorkType, typeof Radio> = { STREAM: Radio, VOICE: Mic, EDIT: Scissors };

function variantLabel(r: RateCard): string {
  if (r.work_type === 'STREAM') return 'Harita başı ücret';
  return r.content_length ? getContentLengthLabel(r.content_length) : 'Her uzunluk';
}

export default async function MyRatesPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  // Admin'in tam yetkili karşılığı /ucretler
  if (currentUser.role === 'ADMIN') redirect('/ucretler');

  const rates = await rateCardService.getByUser(currentUser.id);

  // Müşteriye göre grupla: önce iç iş (Arhaval), sonra ekstra işler
  const groups = new Map<string, { name: string; external: boolean; rows: LedgerRow[] }>();
  for (const r of rates) {
    const key = r.client?.id ?? 'unknown';
    const external = r.client ? !r.client.is_internal : false;
    const g = groups.get(key) ?? { name: r.client?.name ?? 'Diğer', external, rows: [] };
    g.rows.push({
      id: r.id,
      icon: TYPE_ICON[r.work_type],
      tone: external ? 'warning' : 'accent',
      title: getWorkTypeLabel(r.work_type),
      sub: variantLabel(r),
      pill: external ? { label: 'Ekstra iş', tone: 'warning' } : undefined,
      amount: `${formatCurrency(Number(r.pay_amount))}${r.work_type === 'STREAM' ? ' /harita' : ''}`,
    });
    groups.set(key, g);
  }
  const ordered = [...groups.values()].sort((a, b) => Number(a.external) - Number(b.external));

  return (
    <PageShell icon={PageIcon} title="Ücretlerim" description="İş başına hak edişin">
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Girdiğin işlerin ücreti bu fiyatlardan <b className="text-[var(--color-text-primary)]">otomatik</b> hesaplanır.
            Yayında ücret, harita sayısıyla çarpılır. Bir fiyat yanlışsa yöneticine yaz.
          </p>
        </div>

        {ordered.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-10 text-center text-sm text-[var(--color-text-muted)]">
            Henüz senin için tanımlı bir fiyat yok. Yöneticin fiyatlarını girince burada görünecek.
          </p>
        ) : (
          ordered.map((g) => (
            <LedgerList
              key={g.name}
              title={g.external ? `${g.name} · ekstra iş` : g.name}
              rows={g.rows}
              emptyText="Fiyat yok"
            />
          ))
        )}
      </div>
    </PageShell>
  );
}
