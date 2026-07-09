'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { ideaService } from '@/services/idea.service';
import { notificationService } from '@/services/notification.service';
import type { IdeaCategory, VoteType, SuggestPlatform } from './idea.constants';

const VALID_PLATFORMS: SuggestPlatform[] = ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'X'];

async function currentUser() {
  const user = await userService.getCurrentUser();
  return user ? { id: user.id, role: user.role } : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

export async function createIdea(formData: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: 'Oturum gerekli' };

  const title = str(formData.get('title'));
  const category = (str(formData.get('category')) as IdeaCategory) ?? 'CONTENT';
  if (!title) return { error: 'Başlık zorunlu' };

  const suggestedPlatforms = formData.getAll('suggested_platforms')
    .map((p) => String(p))
    .filter((p): p is SuggestPlatform => (VALID_PLATFORMS as string[]).includes(p));

  const res = await ideaService.create({
    title,
    summary: str(formData.get('summary')),
    category,
    authorId: user.id,
    suggestedPlatforms,
    suggestedFormat: str(formData.get('suggested_format')),
  });
  if (!res.error) {
    await notificationService.notify({
      roles: ['ADMIN'],
      title: '💡 Yeni fikir',
      body: title,
      url: '/fikir-havuzu',
      excludeUserId: user.id,
    });
  }
  revalidatePath('/fikir-havuzu');
  return res;
}

export async function voteIdea(ideaId: string, vote: VoteType): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: 'Oturum gerekli' };
  const res = await ideaService.vote(ideaId, user.id, vote);
  revalidatePath('/fikir-havuzu');
  return res;
}

export async function deleteIdea(ideaId: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: 'Oturum gerekli' };
  // admin or the original author may delete
  if (user.role !== 'ADMIN') {
    const raw = await ideaService.getRaw(ideaId);
    if (!raw || raw.author_id !== user.id) return { error: 'Yetki yok' };
  }
  const res = await ideaService.remove(ideaId);
  revalidatePath('/fikir-havuzu');
  return res;
}

export async function rejectIdea(ideaId: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return { error: 'Yetki yok' };
  const res = await ideaService.reject(ideaId);
  revalidatePath('/fikir-havuzu');
  return res;
}

export async function approveIdea(ideaId: string, formData: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return { error: 'Yetki yok' };

  const platforms = formData.getAll('platforms').map((p) => String(p)).filter(Boolean);
  const content_type = str(formData.get('content_type')) ?? 'Video';
  if (platforms.length === 0) return { error: 'En az bir platform seçin' };

  const idea = await ideaService.getRaw(ideaId);
  const res = await ideaService.approve(ideaId, user.id, { platforms, content_type });
  if (!res.error && idea?.author_id) {
    await notificationService.notify({
      userIds: [idea.author_id],
      title: '🎉 Fikrin onaylandı',
      body: `"${idea.title}" İçerik Planı'na aktarıldı.`,
      url: '/fikir-havuzu',
      excludeUserId: user.id,
    });
  }
  revalidatePath('/fikir-havuzu');
  revalidatePath('/icerik-plani');
  return res;
}

/** Admin-only AI evaluation, grounded in this genre's real view averages. */
export async function evaluateIdea(ideaId: string): Promise<{ comment?: string; score?: number | null; error?: string }> {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return { error: 'Yetki yok' };

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { error: 'ANTHROPIC_API_KEY tanımlı değil' };

  const idea = await ideaService.getRaw(ideaId);
  if (!idea) return { error: 'Fikir bulunamadı' };
  if (idea.ai_comment) return { comment: idea.ai_comment, score: idea.ai_score }; // cached, don't regenerate

  const genre = ideaService.ideaGenre(idea.title, idea.summary);
  const genreLabel = ideaService.genreLabel(genre);
  const { genreAvg, overallAvg, sample } = await ideaService.genreBenchmark(genre);
  const catLabel = idea.category === 'CONTENT' ? 'İçerik' : idea.category === 'BUSINESS' ? 'İş' : 'Strateji';

  const prompt = [
    'Bir Türk CS2/espor içerik kanalının (Arhaval) fikir havuzunu değerlendiren asistansın.',
    'Aşağıdaki fikri TEK yorumda üç açıdan harmanlayarak değerlendir: içerik açısı, iş/operasyon açısı, strateji açısı.',
    'Türkçe, 4-6 cümle. Sonunda MUTLAKA yeni satırda "Tahmini tutma: %X" yaz (X 0-100 tam sayı).',
    'ÖNEMLİ: Yüzdeyi havadan verme — aşağıdaki gerçek performans verisine dayandır:',
    `bu fikir "${genreLabel}" türüne giriyor; bu türün kanal ortalaması ${Math.round(genreAvg).toLocaleString('tr-TR')} izlenme` +
      ` (${sample} video), kanal geneli ortalama ${Math.round(overallAvg).toLocaleString('tr-TR')} izlenme.` +
      ' Tür ortalaması genel ortalamanın üstündeyse tutma tahminini yüksek, altındaysa düşük tut; fikrin özgünlüğünü de hesaba kat.',
    '',
    `Kategori: ${catLabel}`,
    `Başlık: ${idea.title}`,
    `Özet: ${(idea.summary ?? '').slice(0, 600)}`,
  ].join('\n');

  let comment: string;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
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

  const match = comment.match(/%\s*(\d{1,3})/);
  const score = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : null;

  const saved = await ideaService.saveEvaluation(ideaId, comment, score, genre);
  if (saved.error) return { error: saved.error };
  revalidatePath('/fikir-havuzu');
  return { comment, score };
}
