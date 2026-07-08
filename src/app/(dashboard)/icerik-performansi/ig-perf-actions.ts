'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { createAdminClient } from '@/lib/supabase/admin';
import { instagramService } from '@/services/instagram.service';
import { instagramPerformanceService } from '@/services/instagram-performance.service';
import { IG_TYPE_LABELS } from './ig-perf.constants';
import { LABEL_META } from './perf.constants';

async function assertAdmin(): Promise<boolean> {
  const user = await userService.getCurrentUser();
  return Boolean(user && user.role === 'ADMIN');
}

export async function syncInstagramNow(): Promise<{ synced?: number; error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };
  const result = await instagramService.syncMedia();
  if (result.error) return { error: result.error };
  revalidatePath('/icerik-performansi');
  return { synced: result.synced };
}

export async function commentOnMedia(mediaId: string): Promise<{ comment?: string; error?: string }> {
  if (!(await assertAdmin())) return { error: 'Yetki yok' };

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { error: 'ANTHROPIC_API_KEY tanımlı değil' };

  const scored = await instagramPerformanceService.getAllScored();
  const media = scored.find((m) => m.media_id === mediaId);
  if (!media) return { error: 'Gönderi bulunamadı' };
  if (media.claude_comment) return { comment: media.claude_comment };

  const scoreText =
    media.score != null
      ? `türü ortalamasının ${media.score.toFixed(2)} katı beğeni (${LABEL_META[media.label].text})`
      : 'henüz yeterli veri yok (bu türde <5 gönderi)';

  const prompt = [
    'Bir Instagram hesabının içerik performansını yorumlayan bir asistansın.',
    'Aşağıdaki tek gönderiyi değerlendir. Türkçe, 2-3 cümle yaz. Şu formatta:',
    '"Bu gönderi [türünün X katı] tuttu. Muhtemel sebep: [...]. Öneri: [...]"',
    'Sayıları ben hesapladım; sadece yorumla, yeniden hesaplama yapma.',
    '',
    `Tür: ${IG_TYPE_LABELS[media.content_type]}`,
    `Açıklama: ${(media.caption ?? '').slice(0, 300)}`,
    `Beğeni: ${media.like_count}`,
    `Yorum: ${media.comment_count}`,
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

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('instagram_media')
    .update({ claude_comment: comment, commented_at: new Date().toISOString() })
    .eq('media_id', mediaId);
  if (error) return { error: error.message };

  revalidatePath('/icerik-performansi');
  return { comment };
}
