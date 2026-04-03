/**
 * Haftalık Program Sayfası
 * Admin: düzenler. Herkes görür + kopyalar.
 */

import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { weeklyScheduleService, userService } from '@/services';
import { ScheduleEditor } from './schedule-editor';
import { CalendarDays } from 'lucide-react';

export default async function WeeklySchedulePage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');

  const isAdmin = currentUser.role === 'ADMIN';
  const schedule = await weeklyScheduleService.getAll();

  return (
    <PageShell
      title="Haftalık Program"
      description="Sabit haftalık içerik ritmi — ekibinle paylaş"
    >
      {/* ── Nav Tabs ── */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {[
          { href: '/content', label: 'Takvim' },
          { href: '/content/performance', label: 'Performans & ROI' },
          { href: '/content/goals', label: 'Haftalık Hedefler' },
          { href: '/content/schedule', label: 'Haftalık Program', active: true },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={
              tab.active
                ? 'border-b-2 border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]'
                : 'px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors'
            }
          >
            {tab.label}
          </a>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
            <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
              Haftalık İçerik Ritmi
            </CardTitle>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Her hafta tekrar eden sabit program. Takvim'deki spesifik planlardan farklı — bu genel ritminiz.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <ScheduleEditor schedule={schedule} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
