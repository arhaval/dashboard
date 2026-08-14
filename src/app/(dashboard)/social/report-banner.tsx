/**
 * "Rapor hazır değil" şeridi.
 *
 * Durum TABLODA TUTULMUYOR, doluluktan türetiliyor: eksik alan kaldığı sürece
 * görünür, tamamlanınca kendiliğinden kaybolur. Kaydedilen bir bildirim
 * durumu tutulsaydı kullanıcı veriyi girdikten sonra da "hazır değil" yazmaya
 * devam edebilirdi.
 */

import Link from 'next/link';
import { FileWarning } from 'lucide-react';
import { monthLabel, type MonthCompleteness } from './social-monthly.constants';

export function ReportBanner({ completeness }: { completeness: MonthCompleteness }) {
  if (completeness.isComplete || completeness.total === 0) return null;

  const missing = completeness.total - completeness.filled;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] px-4 py-3"
      style={{ backgroundColor: 'var(--color-warning-muted)', border: '1px solid var(--color-border)' }}
    >
      <FileWarning className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {monthLabel(completeness.month)} raporu hazır değil
        </p>
        <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {completeness.filled} / {completeness.total} metrik toplandı. {missing} alanı tamamlayarak raporu kapat.
        </p>
      </div>
      <Link
        href={`/social/data?month=${completeness.month}`}
        className="rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-semibold"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
      >
        Raporu Tamamla
      </Link>
    </div>
  );
}
