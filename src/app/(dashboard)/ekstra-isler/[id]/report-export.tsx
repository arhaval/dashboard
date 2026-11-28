'use client';

/**
 * Ekstra iş raporu dışa aktarma — müşteriye giden "Tarih / Yayıncı / Harita
 * Sayısı / Ücret" tablosu. Excel/PDF üretimi ortak TableExport'tadır.
 */

import { TableExport, type ExportColumn } from '@/components/reports/table-export';

export interface ReportRow {
  date: string;
  publisher: string;
  maps: number | null;
  fee: number;
}

const COLUMNS: ExportColumn[] = [
  { label: 'Tarih', width: 1 },
  { label: 'Yayıncı', width: 2 },
  { label: 'Harita Sayısı', width: 1, align: 'center' },
  { label: 'Ücret', width: 1.2, align: 'right' },
];

function fmtAmount(n: number): string {
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReportExport({
  clientName,
  monthLabel,
  rows,
  total,
}: {
  clientName: string;
  monthLabel: string;
  rows: ReportRow[];
  total: number;
}) {
  return (
    <TableExport
      fileName={`${clientName}-${monthLabel}-is-raporu`}
      title={`${clientName} - İş Raporu`}
      subtitle={monthLabel}
      columns={COLUMNS}
      rows={rows.map((r) => [
        new Date(r.date).toLocaleDateString('tr-TR'),
        r.publisher,
        r.maps != null ? String(r.maps) : '-',
        `${fmtAmount(r.fee)} TL`,
      ])}
      footer={['', '', 'Toplam', `${fmtAmount(total)} TL`]}
    />
  );
}
