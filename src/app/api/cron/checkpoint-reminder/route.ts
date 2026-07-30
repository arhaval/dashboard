/**
 * Ölçüm noktası hatırlatması (Vercel Cron) — 6 saatte bir.
 *
 * Bir içerik yayınlandıktan 24 saat / 7 gün / 30 gün sonra admine bildirim
 * gider. Asıl amacı TikTok ve X gibi API'si olmayan platformların sayılarını
 * ZAMANINDA girdirmek: o pencere kapandıktan sonra girilen rakam artık
 * "24 saatlik sonuç" değildir ve sistem onu o noktaya işlemez.
 *
 * Bildirim penceresi, snapshot'ın hâlâ yazılabileceği tolerans aralığıyla
 * BİREBİR aynı tutulur (24s→8sa, 7g→18sa, 30g→36sa) — kapanmış bir pencere için
 * "sayıları gir" demek, girilse bile işlenmeyecek veri istemek olurdu.
 *
 * Tekrar bildirimi content_checkpoint_reminders tablosu engeller: içerik + nokta
 * başına tek satır, unique index ile veritabanı seviyesinde de garanti.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { notificationService } from '@/services/notification.service';
import { denyCron } from '@/lib/cron-auth';
import {
  dueCheckpointReminders,
  CHECKPOINT_LABELS,
  type CheckpointKey,
} from '@/app/(dashboard)/icerik-performansi/publication-snapshot.constants';
import { PLATFORM_LABELS, type ContentPlatform } from '@/app/(dashboard)/icerik-plani/content-queue.constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** API entegrasyonu olmayan, sayıları elle girilen platformlar. */
const MANUAL_PLATFORMS: ContentPlatform[] = ['TIKTOK', 'X', 'TWITCH'];

/** 30 günlük pencereden daha eski içeriklere hiç bakmaya gerek yok. */
const LOOKBACK_DAYS = 32;

export async function GET(request: Request) {
  const denied = denyCron(request);
  if (denied) return denied;

  const admin = createAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);

  const { data: cardRows } = await admin
    .from('content_queue')
    .select('id, title, published_date')
    .eq('status', 'YAYINLANDI')
    .gte('published_date', since);
  const cards = (cardRows ?? []) as { id: string; title: string; published_date: string | null }[];
  if (cards.length === 0) return Response.json({ sent: 0, reason: 'Pencerede yayın yok' });

  const cardIds = cards.map((c) => c.id);

  const [{ data: pubRows }, { data: sentRows }] = await Promise.all([
    admin.from('content_publications').select('content_queue_id, platform, views, likes, impressions').in('content_queue_id', cardIds),
    admin.from('content_checkpoint_reminders').select('content_queue_id, checkpoint').in('content_queue_id', cardIds),
  ]);

  const pubsByCard = new Map<string, { platform: string; views: number | null; likes: number | null; impressions: number | null }[]>();
  for (const p of (pubRows ?? []) as { content_queue_id: string; platform: string; views: number | null; likes: number | null; impressions: number | null }[]) {
    const arr = pubsByCard.get(p.content_queue_id) ?? [];
    arr.push(p);
    pubsByCard.set(p.content_queue_id, arr);
  }

  const sentByCard = new Map<string, CheckpointKey[]>();
  for (const r of (sentRows ?? []) as { content_queue_id: string; checkpoint: CheckpointKey }[]) {
    const arr = sentByCard.get(r.content_queue_id) ?? [];
    arr.push(r.checkpoint);
    sentByCard.set(r.content_queue_id, arr);
  }

  let sent = 0;
  const skipped: string[] = [];

  for (const card of cards) {
    const pubs = pubsByCard.get(card.id) ?? [];
    // Hiç platform kaydı yoksa hatırlatacak bir ölçüm de yok.
    if (pubs.length === 0) continue;

    const due = dueCheckpointReminders(card.published_date, sentByCard.get(card.id) ?? [], now);
    if (due.length === 0) continue;

    // Sayısı hâlâ girilmemiş elle-giriş platformları — bildirimin asıl sebebi.
    const pending = pubs
      .filter((p) => MANUAL_PLATFORMS.includes(p.platform as ContentPlatform))
      .filter((p) => p.views == null && p.likes == null && p.impressions == null)
      .map((p) => p.platform as ContentPlatform);

    for (const key of due) {
      // Önce kaydı yaz: bildirim gitse de gitmese de bu nokta bildirilmiş sayılır,
      // aksi halde push başarısız olduğunda her 6 saatte bir tekrar denenir.
      const { error } = await admin.from('content_checkpoint_reminders').insert({
        content_queue_id: card.id,
        checkpoint: key,
        pending_platforms: pending,
      });
      // Unique index reddettiyse başka bir çalışma zaten göndermiş.
      if (error) { skipped.push(`${card.id}:${key}`); continue; }

      const label = CHECKPOINT_LABELS[key];
      const body = pending.length > 0
        ? `“${card.title}” için ${label.toLowerCase()} doldu. ${pending.map((p) => PLATFORM_LABELS[p]).join(' ve ')} sayılarını şimdi gir — pencere kapanınca bu noktaya işlenmez.`
        : `“${card.title}” için ${label.toLowerCase()} doldu. Sonuçlara göz at.`;

      await notificationService.notify({
        roles: ['ADMIN'],
        title: `📊 ${label} — istatistik zamanı`,
        body,
        url: pending.length > 0 ? '/icerik-plani' : '/icerik-performansi',
        // İçerik+nokta başına tek bildirim; cihazda üst üste yığılmaz.
        tag: `checkpoint-${card.id}-${key}`,
      });
      sent += 1;
    }
  }

  return Response.json({ sent, cardsChecked: cards.length, skipped: skipped.length, at: now.toISOString() });
}
