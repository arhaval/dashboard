'use server';

/**
 * Social Actions — İçerik Fikir Havuzu Server Actions
 *
 * 1. submitContentIdea   — İçerik üretici yeni fikir atar
 * 2. reviewContentIdea   — Yönetici fikri onaylar / reddeder, editör/grafiker atar
 * 3. updatePostMetrics   — Performans verisi kaydeder + engagementRate hesaplar
 * 4. getCreatorDashboardData — İçerik üreticinin kendi özet verisini getirir
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { specialPostService } from '@/services';
import type { PostStatus, SpecialPost } from '@/types';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface PostMetricsInput {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface CreatorDashboardData {
  publishedPosts: SpecialPost[];
  totalViews: number;
  avgEngagementRate: number;
}

// ── Auth yardımcıları ─────────────────────────────────────────────────────────

async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');
  return profile as { id: string; role: string };
}

async function requireRole(...roles: string[]) {
  const profile = await getAuthProfile();
  if (!roles.includes(profile.role)) {
    throw new Error(`Bu işlem için yetkiniz yok. Gerekli rol: ${roles.join(' | ')}`);
  }
  return profile;
}

// ── 1. submitContentIdea ──────────────────────────────────────────────────────

/**
 * Giriş yapmış içerik üretici adına ONAY_BEKLIYOR durumunda fikir kartı oluşturur.
 * Session'dan kullanıcı ID'si otomatik alınır; client'tan ID kabul edilmez.
 */
export async function submitContentIdea(
  title: string,
  platforms: string[],
  contentType: string,
  caption?: string,
): Promise<{ success: boolean; error?: string }> {
  // Tüm roller fikir atabilir — sadece giriş yapmış olmak yeterli
  const profile = await getAuthProfile();

  if (!title.trim())          return { success: false, error: 'Başlık boş olamaz.' };
  if (platforms.length === 0) return { success: false, error: 'En az bir platform seçilmeli.' };
  if (!contentType.trim())    return { success: false, error: 'İçerik türü belirtilmeli.' };

  const { post, error } = await specialPostService.create(
    { title: title.trim(), platforms, content_type: contentType.trim(), caption },
    profile.id,
  );

  if (error || !post) return { success: false, error: error ?? 'Fikir oluşturulamadı.' };

  revalidatePath('/content/ideas');
  return { success: true };
}

// ── 2. reviewContentIdea ──────────────────────────────────────────────────────

/**
 * ADMIN fikri ONAYLANDI veya REDDEDILDI yapar.
 * Onaylandığında isteğe bağlı editör ve/veya grafiker atanabilir.
 */
export async function reviewContentIdea(
  postId: string,
  status: Extract<PostStatus, 'ONAYLANDI' | 'REDDEDILDI'>,
  editorId?: string,
  designerId?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireRole('ADMIN');

  if (status !== 'ONAYLANDI' && status !== 'REDDEDILDI') {
    return { success: false, error: 'Geçersiz durum. Sadece ONAYLANDI veya REDDEDILDI kabul edilir.' };
  }

  // Durumu güncelle — editör/grafiker ataması yapılmaz, iş havuzuna bırakılır
  const statusResult = await specialPostService.updateStatus(postId, status);
  if (statusResult.error) return { success: false, error: statusResult.error };

  revalidatePath('/content/ideas');
  revalidatePath('/sosyal-medya');
  return { success: true };
}

// ── 2b. claimPost ─────────────────────────────────────────────────────────────

/**
 * Ekip üyesi (EDITOR veya GRAFIKER) iş havuzundan bir işi üzerine alır.
 * - EDITOR   → editor_id  alanını kendi ID'siyle günceller
 * - GRAFIKER → designer_id alanını kendi ID'siyle günceller
 * İş zaten alınmışsa hata döner.
 */
export async function claimPost(
  postId: string,
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('EDITOR', 'GRAFIKER');

  const post = await specialPostService.getById(postId);
  if (!post) return { success: false, error: 'İçerik bulunamadı.' };
  if (post.status !== 'ONAYLANDI')
    return { success: false, error: 'Sadece onaylanmış işler alınabilir.' };

  if (profile.role === 'EDITOR') {
    if (post.editor_id)
      return { success: false, error: 'Bu iş zaten bir editör tarafından alınmış.' };

    const result = await specialPostService.update(postId, { editor_id: profile.id });
    if (result.error) return { success: false, error: result.error };
  }

  if (profile.role === 'GRAFIKER') {
    if (post.designer_id)
      return { success: false, error: 'Bu iş zaten bir grafiker tarafından alınmış.' };

    const result = await specialPostService.update(postId, { designer_id: profile.id });
    if (result.error) return { success: false, error: result.error };
  }

  revalidatePath('/sosyal-medya');
  revalidatePath('/content/ideas');
  return { success: true };
}

// ── 3. updatePostMetrics ──────────────────────────────────────────────────────

/**
 * Post performans verilerini kaydeder.
 * engagementRate = ((likes + comments + saves) / views) * 100
 * views = 0 ise engagementRate = 0 (sıfıra bölme koruması).
 *
 * Admin veya ilgili editör/grafiker çağırabilir.
 */
export async function updatePostMetrics(
  postId: string,
  metrics: PostMetricsInput,
): Promise<{ success: boolean; engagementRate?: number; error?: string }> {
  await requireRole('ADMIN', 'EDITOR', 'GRAFIKER', 'PUBLISHER');

  const { views, likes, comments, shares, saves } = metrics;

  // Negatif değer koruması
  for (const [key, val] of Object.entries(metrics)) {
    if (val < 0) return { success: false, error: `${key} negatif olamaz.` };
  }

  const engagementRate =
    views > 0 ? Number((((likes + comments + saves) / views) * 100).toFixed(2)) : 0;

  const result = await specialPostService.update(postId, {
    views,
    likes,
    comments,
    shares,
    saves,
    engagement_rate: engagementRate,
  });

  if (result.error) return { success: false, error: result.error };

  revalidatePath('/content/ideas');
  revalidatePath('/sosyal-medya');
  return { success: true, engagementRate };
}

// ── 4. getCreatorDashboardData ────────────────────────────────────────────────

/**
 * İçerik üreticinin kendi yayınlanmış içeriklerini ve performans özetini getirir.
 * userId dışarıdan verilebilir (admin başkasının datasına bakabilir),
 * ama çağıran kullanıcı en azından giriş yapmış olmalı.
 */
export async function getCreatorDashboardData(
  userId: string,
): Promise<CreatorDashboardData> {
  const profile = await getAuthProfile();

  // Admin herkesin datasını görebilir; diğerleri sadece kendi datasını
  if (profile.role !== 'ADMIN' && profile.id !== userId) {
    throw new Error('Yalnızca kendi verilerinizi görüntüleyebilirsiniz.');
  }

  const publishedPosts = await specialPostService.getAll({
    status: 'YAYINLANDI',
    author_id: userId,
  });

  const totalViews = publishedPosts.reduce((sum, p) => sum + p.views, 0);

  const avgEngagementRate =
    publishedPosts.length > 0
      ? Number(
          (
            publishedPosts.reduce((sum, p) => sum + p.engagement_rate, 0) /
            publishedPosts.length
          ).toFixed(2),
        )
      : 0;

  return { publishedPosts, totalViews, avgEngagementRate };
}
