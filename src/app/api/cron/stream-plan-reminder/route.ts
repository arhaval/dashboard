/**
 * Planlı yayın hatırlatması (Vercel Cron) — her gün bir kez.
 *
 *  • Bugün maçı olan yayıncıya: "Bugün yayının var"
 *  • Tarihi geçmiş ama hâlâ girilmemiş (PLANNED/IN_PROGRESS) yayın için:
 *    "Yayını girmeyi unutma" — yayın girilince plan DONE olur ve kendiliğinden
 *    susar. GRACE_DAYS'ten eski planlar için artık hatırlatılmaz (iptal
 *    edilmesi unutulmuş planlar sonsuza kadar bildirim üretmesin).
 *  • Admin'e: girilmeyen yayınların tek satırlık özeti.
 *
 * Cron günde bir çalıştığı için ayrı tekrar-önleme tablosu gerekmez; etiket
 * plan başına sabit olduğundan cihazda bildirimler üst üste yığılmaz.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { notificationService } from '@/services/notification.service';
import { denyCron } from '@/lib/cron-auth';
import { todayTR, daysAgoTR } from '@/lib/utils/dates';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Girilmemiş yayın için en fazla kaç gün hatırlatılır. */
const GRACE_DAYS = 7;
const OPEN_STATUSES = ['PLANNED', 'IN_PROGRESS'];

interface PlanRow {
  id: string;
  title: string;
  planned_date: string;
  assigned_to: string | null;
  assignee: { full_name: string } | null;
}

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const now = new Date();
  const today = todayTR(now);
  const oldest = daysAgoTR(GRACE_DAYS, now);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('content_plans')
    .select('id, title, planned_date, assigned_to, assignee:users!content_plans_assigned_to_fkey(full_name)')
    .eq('content_type', 'STREAM')
    .in('status', OPEN_STATUSES)
    .gte('planned_date', oldest)
    .lte('planned_date', today);

  if (error) {
    return Response.json({ sent: 0, error: error.message }, { status: 500 });
  }

  const plans = (data ?? []) as unknown as PlanRow[];
  const todays = plans.filter((p) => p.planned_date === today && p.assigned_to);
  const overdue = plans.filter((p) => p.planned_date < today && p.assigned_to);

  await Promise.all([
    ...todays.map((p) =>
      notificationService.notify({
        userIds: [p.assigned_to!],
        title: '🎙️ Bugün yayının var',
        body: `${p.title}. Yayından sonra "Yayını gir" ile harita sayısını kaydet.`,
        url: `/work-items/new?plan=${p.id}`,
        tag: `plan-${p.id}`,
      })
    ),
    ...overdue.map((p) =>
      notificationService.notify({
        userIds: [p.assigned_to!],
        title: '⏰ Yayını girmeyi unutma',
        body: `${p.title} henüz girilmedi. Girmezsen ödemesi yapılamaz.`,
        url: `/work-items/new?plan=${p.id}`,
        tag: `plan-${p.id}`,
      })
    ),
  ]);

  if (overdue.length > 0) {
    const names = [...new Set(overdue.map((p) => p.assignee?.full_name).filter(Boolean))];
    await notificationService.notify({
      roles: ['ADMIN'],
      title: `📋 ${overdue.length} planlı yayın girilmedi`,
      body: names.length ? `Bekleyen: ${names.join(', ')}` : 'Planlı yayınları kontrol et.',
      url: '/work-items/planla',
      tag: 'plan-overdue-summary',
    });
  }

  return Response.json({ today: todays.length, overdue: overdue.length, at: now.toISOString() });
}
