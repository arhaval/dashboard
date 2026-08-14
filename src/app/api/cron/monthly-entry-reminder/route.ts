/**
 * Aylık veri girişi hatırlatması (Vercel Cron) — her gün.
 *
 * Ay kapanınca (ayın 1'inden itibaren) geçen ayın verisi eksikse admine
 * bildirim gider ve EKSİK DOLANA KADAR her gün tekrarlar. "Bu ay tam giremedim"
 * durumunun tek çözümü tek seferlik bir hatırlatma değil, susmayan bir takip.
 *
 * Kendiliğinden susar: bütün alanlar dolduğunda `isComplete` true olur ve
 * bildirim üretilmez — kapatma düğmesi gerekmez.
 *
 * Bildirim içeriği eksiklerin TÜRÜNÜ ayırır:
 *   elle girilecek → kullanıcının işi
 *   otomatik gelmemiş → entegrasyon sorunu, elle girmek çözüm değil
 *
 * Aynı gün ikinci bildirimi social_monthly_reminders (month + sent_on tekil)
 * engeller; cron günde birden fazla çalışsa da tek bildirim gider.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { notificationService } from '@/services/notification.service';
import { denyCron } from '@/lib/cron-auth';
import {
  monthCompleteness,
  monthLabel,
  previousMonth,
  MONTHLY_PLATFORMS,
} from '@/app/(dashboard)/social/social-monthly.constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Ayın kaçında hatırlatmaya başlanır. */
const START_DAY_OF_MONTH = 1;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (now.getDate() < START_DAY_OF_MONTH) {
    return Response.json({ sent: 0, reason: 'Hatırlatma penceresi açılmadı' });
  }

  const admin = createAdminClient();

  // Kapanmış son ay — içinde bulunulan ay henüz bitmediği için istenmez.
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = previousMonth(currentMonth);

  const { data: rows, error } = await admin
    .from('social_monthly_metrics')
    .select('*')
    .eq('month', month);
  if (error) {
    return Response.json({ sent: 0, error: error.message }, { status: 500 });
  }

  const completeness = monthCompleteness(month, (rows ?? []) as { platform: string }[], MONTHLY_PLATFORMS);
  if (completeness.isComplete) {
    return Response.json({ sent: 0, month, reason: 'Tüm alanlar dolu', percent: 100 });
  }

  // Önce kaydı yaz: bildirim gitse de gitmese de bugün bildirilmiş sayılır,
  // aksi halde push başarısız olduğunda cron her çalışmada tekrar dener.
  const incomplete = completeness.platforms.filter((p) => p.filled < p.total);
  const missingFieldCount = incomplete.reduce((s, p) => s + (p.total - p.filled), 0);

  const { error: insertError } = await admin.from('social_monthly_reminders').insert({
    month,
    sent_on: today,
    missing_platforms: incomplete.map((p) => p.platform),
    missing_field_count: missingFieldCount,
  });
  // Tekil index reddettiyse bugün zaten gönderilmiş.
  if (insertError) {
    return Response.json({ sent: 0, month, reason: 'Bugün zaten gönderildi' });
  }

  // Elle girilecekler öne, entegrasyon sorunları ayrı satıra.
  const manual = incomplete.filter((p) => p.pendingManualFields.length > 0);
  const broken = incomplete.filter((p) => p.brokenApiFields.length > 0);

  const lines: string[] = [];
  if (manual.length > 0) {
    lines.push(manual.map((p) => `${p.label}: ${p.pendingManualFields.join(', ')}`).join(' · '));
  }
  if (broken.length > 0) {
    lines.push(`Otomatik gelmeyen: ${broken.map((p) => p.label).join(', ')}`);
  }

  await notificationService.notify({
    roles: ['ADMIN'],
    title: `📈 ${monthLabel(month)} raporu hazır değil`,
    body:
      `${completeness.filled}/${completeness.total} metrik toplandı. ` +
      `${missingFieldCount} alanı tamamlayarak raporu kapat. ${lines.join(' — ')}`,
    // Doğrudan o ayın Veri Merkezi'ne: bildirime dokunan kişi ay seçmek
    // zorunda kalmasın.
    url: `/social/data?month=${month}`,
    // Ay başına tek etiket: cihazda üst üste yığılmaz, her gün üstüne yazar.
    tag: `monthly-entry-${month}`,
  });

  return Response.json({
    sent: 1,
    month,
    percent: completeness.percent,
    missingFieldCount,
    platforms: incomplete.map((p) => ({
      platform: p.platform,
      manual: p.pendingManualFields,
      api: p.brokenApiFields,
    })),
    at: now.toISOString(),
  });
}
