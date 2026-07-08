'use server';

/**
 * İçerik Performansı server actions.
 * - syncVideosNow: admin-triggered YouTube pull (cron also runs daily)
 * - commentOnVideo: generate a short Turkish comment via Claude (Haiku 4.5)
 *   and persist it so we never regenerate. Button is disabled client-side
 *   when ANTHROPIC_API_KEY is absent; this also guards server-side.
 *
 * Scoring is computed in code (videoPerformanceService). Claude only writes
 * the comment — it never computes the numbers.
 */

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncYouTubeVideos } from '@/services/youtube.service';
import { videoPerformanceService } from '@/services/video-performance.service';
import { LABEL_META, VIDEO_GENRE_LABELS, VIDEO_GENRES, type VideoGenre } from './perf.constants';

async function assertAdmin(): Promise<{ ok: boolean; error?: string }> {
  const user = await userService.getCurrentUser();
  if (!user) return { ok: false, error: 'Oturum gerekli' };
  if (user.role !== 'ADMIN') return { ok: false, error: 'Yetki yok' };
  return { ok: true };
}

export async function syncVideosNow(): Promise<{ synced?: number; error?: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return { error: admin.error };

  const result = await syncYouTubeVideos();
  if (result.error) return { error: result.error };

  revalidatePath('/icerik-performansi');
  return { synced: result.synced };
}

/** Manually set a video's genre. Locks it so future syncs don't overwrite. */
export async function setVideoGenre(
  videoId: string,
  genre: VideoGenre
): Promise<{ error?: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return { error: admin.error };
  if (!VIDEO_GENRES.includes(genre)) return { error: 'Geçersiz tür' };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('video_performance')
    .update({ genre, genre_locked: true })
    .eq('video_id', videoId);
  if (error) return { error: error.message };

  revalidatePath('/icerik-performansi');
  return {};
}

export async function commentOnVideo(videoId: string): Promise<{ comment?: string; error?: string }> {
  const admin = await assertAdmin();
  if (!admin.ok) return { error: admin.error };

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { error: 'ANTHROPIC_API_KEY tanımlı değil' };

  // Find the scored video (score computed in code, not by Claude)
  const scored = await videoPerformanceService.getAllScored();
  const video = scored.find((v) => v.video_id === videoId);
  if (!video) return { error: 'Video bulunamadı' };

  // Already commented → return cached, do not call the API again
  if (video.claude_comment) return { comment: video.claude_comment };

  const typeLabel = VIDEO_GENRE_LABELS[video.effective_genre];
  const scoreText =
    video.score != null
      ? `türü ortalamasının ${video.score.toFixed(2)} katı (${LABEL_META[video.label].text})`
      : 'henüz yeterli veri yok (bu türde <5 video)';

  const prompt = [
    'Bir YouTube kanalının içerik performansını yorumlayan bir asistansın.',
    'Aşağıdaki tek videoyu değerlendir. Türkçe, 2-3 cümle yaz. Şu formatta:',
    '"Bu video [türünün X katı] tuttu. Muhtemel sebep: [...]. Öneri: [...]"',
    'Sayıları ben hesapladım; sadece yorumla, yeniden hesaplama yapma.',
    '',
    `Başlık: ${video.title}`,
    `Tür: ${typeLabel}`,
    `Görüntülenme: ${video.view_count}`,
    `Beğeni: ${video.like_count}`,
    `Yorum: ${video.comment_count}`,
    `Performans: ${scoreText}`,
  ].join('\n');

  let comment: string;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { error: `Claude API hatası (${res.status}): ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    if (data.stop_reason === 'refusal') return { error: 'Claude yorumu reddetti' };
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === 'text');
    comment = textBlock?.text?.trim();
    if (!comment) return { error: 'Boş yanıt geldi' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ağ hatası' };
  }

  // Persist so we never regenerate
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('video_performance')
    .update({ claude_comment: comment, commented_at: new Date().toISOString() })
    .eq('video_id', videoId);
  if (error) return { error: error.message };

  revalidatePath('/icerik-performansi');
  return { comment };
}
