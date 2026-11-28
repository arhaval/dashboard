/**
 * Ekstra İş Raporu — tek müşteri (ör. Sangal) için aylık iş dökümü.
 * Admin bu raporu Excel/PDF indirip ortağa gönderir.
 * Kolonlar: Tarih · Yayıncı · Harita Sayısı · Ücret (ortağın ödediği).
 */

import { Building2 as PageIcon } from 'lucide-react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { userService, workItemService } from '@/services';
import { clientService } from '@/services/client.service';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { ReportMonthNav } from './month-nav';
import { ReportExport } from './report-export';

export const dynamic = 'force-dynamic';

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${TR_MONTHS[m - 1]} ${y}`;
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${month}-${String(d).padStart(2, '0')}`;
}

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ay?: string }>;
}) {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/');

  const { id } = await params;
  const { ay } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(ay ?? '') ? (ay as string) : new Date().toISOString().slice(0, 7);

  const client = await clientService.getById(id);
  if (!client) notFound();

  const items = await workItemService.getAll({
    client_id: id,
    date_from: `${month}-01`,
    date_to: lastDayOfMonth(month),
  });

  // Rapor satırları: tarihe göre artan.
  const rows = [...items]
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((i) => ({
      date: i.work_date,
      publisher: i.user?.full_name ?? '—',
      maps: i.map_count ?? null,
      fee: i.bill_amount != null ? Number(i.bill_amount) : 0,
    }));

  const total = rows.reduce((s, r) => s + r.fee, 0);
  const label = monthLabel(month);

  return (
    <PageShell icon={PageIcon}
      title={`${client.name} — İş Raporu`}
      description={`${label} · ortağa gönderilecek döküm`}
      actions={
        <ReportExport clientName={client.name} monthLabel={label} rows={rows} total={total} />
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/ekstra-isler"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Ekstra İşler
        </Link>
        <ReportMonthNav month={month} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              {label} için {client.name} işi yok.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase text-[var(--color-text-muted)]">
                    <th className="pb-2 pr-4 font-medium">Tarih</th>
                    <th className="pb-2 pr-4 font-medium">Yayıncı</th>
                    <th className="pb-2 pr-4 text-center font-medium">Harita Sayısı</th>
                    <th className="pb-2 pr-4 text-right font-medium">Ücret</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]"
                    >
                      <td className="py-2.5 pr-4 font-mono text-[var(--color-text-primary)]">
                        {new Date(r.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-2.5 pr-4 text-[var(--color-text-primary)]">{r.publisher}</td>
                      <td className="py-2.5 pr-4 text-center">{r.maps ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-[var(--color-text-primary)]">
                        {formatCurrency(r.fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-[var(--color-text-secondary)]">
                      Toplam
                    </td>
                    <td className="pt-3 text-right font-mono text-base font-bold text-[var(--color-text-primary)]">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
