/**
 * "İşlerim / Yayınlarım" — admin dışı roller için İş Takibi görünümü.
 * Yalnızca kişinin KENDİ işleri: ay + müşteri (Arhaval / Sangal…) filtresi,
 * durum bazlı hak ediş özeti, satırda düzelt/sil ve aylık döküm (Excel/PDF).
 */

import Link from 'next/link';
import { Plus, Hourglass, Wallet, CheckCircle2, Radio, Briefcase } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SegmentedControl, type TabItem } from '@/components/ui/tabs';
import { MonthPicker } from '@/components/ui/month-picker';
import { Pager } from '@/components/ui/pager';
import { TableExport, type ExportColumn } from '@/components/reports/table-export';
import { OverviewCard, CapacityCard, SectionHead } from '@/components/dashboard/widgets';
import { TR_MONTHS } from '@/components/dashboard/utils';
import { paginate, parsePage } from '@/lib/paginate';
import { formatCurrency, getWorkTypeLabel } from '@/lib/utils';
import {
  MEMBER_STATUS, INTERNAL_CLIENT_LABEL, clientLabelOf, splitByClient, summarizeWork, workItemTitle,
} from '@/lib/work-summary';
import type { WorkItem } from '@/types';
import { MyWorkList } from './my-work-list';
import { currentMonthTR } from '@/lib/utils/dates';

export interface MyWorkParams {
  ay?: string;
  musteri?: string;
  sayfa?: string;
}

interface MyWorkViewProps {
  items: WorkItem[];
  params: MyWorkParams;
  fullName: string;
  isPublisher: boolean;
}

const ALL_CLIENTS = 'tumu';

const EXPORT_COLUMNS: ExportColumn[] = [
  { label: 'Tarih', width: 1 },
  { label: 'İş', width: 2.4 },
  { label: 'Kimin için', width: 1.2 },
  { label: 'Harita', width: 0.7, align: 'center' },
  { label: 'Durum', width: 1.3 },
  { label: 'Ücret', width: 1.2, align: 'right' },
];

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${TR_MONTHS[m - 1]} ${y}`;
}

function hrefWith(params: MyWorkParams, patch: Partial<MyWorkParams>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...patch, sayfa: undefined };
  for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
  return `/work-items?${next.toString()}`;
}

export function MyWorkView({ items, params, fullName, isPublisher }: MyWorkViewProps) {
  const month = params.ay && /^\d{4}-\d{2}$/.test(params.ay) ? params.ay : currentMonthTR();
  const client = params.musteri ?? ALL_CLIENTS;

  const inMonth = items.filter((i) => i.work_date.startsWith(month));
  const clientNames = [...new Set(inMonth.map(clientLabelOf))].sort((a, b) =>
    a === INTERNAL_CLIENT_LABEL ? -1 : b === INTERNAL_CLIENT_LABEL ? 1 : a.localeCompare(b, 'tr')
  );
  const visible = client === ALL_CLIENTS ? inMonth : inMonth.filter((i) => clientLabelOf(i) === client);
  const sorted = [...visible].sort((a, b) => b.work_date.localeCompare(a.work_date));
  const sum = summarizeWork(visible);
  // Ödeme bekleyen alacak aya bağlı değil: önceki aylardan kalanı da göster,
  // yoksa ana sayfadaki "Bekleyen alacak" ile çelişiyor gibi görünür.
  const allPending = summarizeWork(items).approved;
  const paged = paginate(sorted, parsePage(params.sayfa));

  const clientTabs: TabItem[] = [
    { key: ALL_CLIENTS, label: 'Tümü', count: inMonth.length, href: hrefWith(params, { ay: month, musteri: undefined }), active: client === ALL_CLIENTS },
    // Seçili müşterinin bu ay kaydı kalmadıysa bile sekmesi görünsün.
    ...(client !== ALL_CLIENTS && !clientNames.includes(client) ? [...clientNames, client] : clientNames).map((name) => ({
      key: name,
      label: name,
      count: inMonth.filter((i) => clientLabelOf(i) === name).length,
      href: hrefWith(params, { ay: month, musteri: name }),
      active: client === name,
    })),
  ];

  const label = monthLabel(month);
  const unit = isPublisher ? 'yayın' : 'iş';
  const scope = client === ALL_CLIENTS ? '' : ` · ${client}`;

  return (
    <PageShell
      icon={isPublisher ? Radio : Briefcase}
      title={isPublisher ? 'Yayınlarım' : 'İşlerim'}
      description="Girdiğin işler, onay durumu ve hak edişin. Onaylanana kadar düzeltebilirsin."
      actions={
        <Link href="/work-items/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {isPublisher ? 'Yayın gir' : 'İş gir'}
          </Button>
        </Link>
      }
    >
      {/* ── Filtreler ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker month={month} />
          {(clientTabs.length > 2 || client !== ALL_CLIENTS) && <SegmentedControl items={clientTabs} />}
        </div>
        <TableExport
          fileName={`${fullName}-${label}-is-dokumu`}
          title={`${fullName} - İş Dökümü`}
          subtitle={`${label}${scope}`}
          columns={EXPORT_COLUMNS}
          rows={sorted.map((i) => [
            new Date(i.work_date).toLocaleDateString('tr-TR'),
            `${getWorkTypeLabel(i.work_type)} · ${workItemTitle(i)}`,
            clientLabelOf(i),
            i.map_count ? String(i.map_count) : '-',
            MEMBER_STATUS[i.status].label,
            i.cost != null ? formatCurrency(Number(i.cost)) : 'Belirlenecek',
          ])}
          footer={['', '', '', String(sum.maps || ''), 'Toplam', formatCurrency(sum.total)]}
        />
      </div>

      {/* ── Özet ── */}
      <section className="mt-6">
        <SectionHead title={`${label}${scope}`} chip={`${sum.count} ${unit}${isPublisher ? ` · ${sum.maps} harita` : ''}`} />
        <div className="grid gap-3 sm:grid-cols-3">
          <OverviewCard
            label="Onay bekliyor"
            hint="Girdiğin, admin onayı bekleyen işler"
            value={formatCurrency(sum.draft.amount)}
            trend="neutral"
            trendText={
              sum.draft.unpriced > 0
                ? `${sum.draft.count} ${unit} · ${sum.draft.unpriced} tanesinin ücreti belirlenecek`
                : `${sum.draft.count} ${unit}`
            }
            icon={Hourglass}
            iconColor="var(--color-text-secondary)"
          />
          <OverviewCard
            label="Ödeme bekliyor"
            hint="Onaylandı, ödemesi yapılacak"
            value={formatCurrency(sum.approved.amount)}
            trend="neutral"
            trendText={
              allPending.amount > sum.approved.amount
                ? `${sum.approved.count} ${unit} · toplam bekleyen ${formatCurrency(allPending.amount)}`
                : `${sum.approved.count} ${unit}`
            }
            icon={Wallet}
            iconColor="var(--color-warning)"
          />
          <OverviewCard
            label="Ödendi"
            hint="Bu ay içinde yapılan ve ödenen işler"
            value={formatCurrency(sum.paid.amount)}
            trend="neutral"
            trendText={`${sum.paid.count} ${unit}`}
            icon={CheckCircle2}
            iconColor="var(--color-success)"
          />
        </div>
      </section>

      {client === ALL_CLIENTS && clientNames.length > 1 && (
        <div className="mt-3">
          <CapacityCard
            title="Kimin için"
            subtitle="Hak edişin müşteriye göre"
            chip={label}
            total={sum.total}
            totalLabel="toplam"
            segments={splitByClient(visible)}
            format={formatCurrency}
          />
        </div>
      )}

      {/* ── Liste ── */}
      <section className="mt-6">
        <SectionHead title={isPublisher ? 'Yayınlar' : 'İşler'} />
        <MyWorkList items={paged.rows} emptyText={`${label}${scope} için kayıt yok.`} />
        <Pager paged={paged} basePath="/work-items" params={{ ...params, ay: month }} label={unit} />
      </section>
    </PageShell>
  );
}
