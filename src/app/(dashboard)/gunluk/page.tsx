import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { dailyNoteService } from '@/services/daily-note.service';
import { Journal } from './journal';

export const dynamic = 'force-dynamic';

export default async function GunlukPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');

  const { data: entries, missingTable, error } = await dailyNoteService.list(user.id);

  return (
    <PageShell
      title="Günlük"
      description="Her gün bir sayfa. Yazdıkça kaydeder, geçmiş günlerde arama yapar."
    >
      {missingTable ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-muted)] px-4 py-3 text-sm text-[var(--color-warning)]">
          Veritabanı güncellemesi bekliyor: <code>20261020_daily_notes.sql</code> çalıştırılmalı.
          Çalıştırıldıktan sonra bu sayfa kendiliğinden açılır.
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-muted)] px-4 py-3 text-sm text-[var(--color-error)]">
          Günlük okunamadı: {error}
        </div>
      ) : (
        <Journal entries={entries} />
      )}
    </PageShell>
  );
}
