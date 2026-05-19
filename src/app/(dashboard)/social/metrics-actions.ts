/**
 * Social Metrics Server Actions
 * Admin-only actions for monthly social media metrics
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { socialMetricsService } from '@/services';
import { METRICS_PLATFORMS } from '@/constants';
import type { CreateSocialMonthlyMetricsInput, CreateSocialGoalInput, MetricsPlatform } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Verify current user is admin
 */
async function verifyAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (userError || !dbUser) {
    return { isAdmin: false, error: 'User not found' };
  }

  if (dbUser.role !== 'ADMIN') {
    return { isAdmin: false, error: 'Forbidden: Admin access required' };
  }

  return { isAdmin: true };
}

// =============================================================================
// Engagement Rate Calculation
// =============================================================================

/**
 * Aylık kanal geneli etkileşim oranını platform'a göre hesaplar.
 *
 * X         : (beğeni + yanıt + retweet) / gösterim * 100
 * Instagram : (beğeni + yorum + kaydetme) / görüntülenme * 100
 * YouTube   : (beğeni + yorum) / video_görüntülenme * 100
 * Twitch / Kick : 0 (standart formül yok)
 */
function calculateMonthlyEngagementRate(
  input: CreateSocialMonthlyMetricsInput
): number {
  switch (input.platform) {
    case 'X': {
      const numerator =
        (input.likes ?? 0) + (input.replies ?? 0) + (input.shares ?? 0);
      const denominator = input.impressions ?? 0;
      if (denominator <= 0) return 0;
      return parseFloat(((numerator / denominator) * 100).toFixed(2));
    }
    case 'INSTAGRAM': {
      const numerator =
        (input.likes ?? 0) + (input.comments ?? 0) + (input.saves ?? 0);
      const denominator = input.views ?? 0;
      if (denominator <= 0) return 0;
      return parseFloat(((numerator / denominator) * 100).toFixed(2));
    }
    case 'YOUTUBE': {
      const numerator =
        (input.total_likes ?? 0) + (input.total_comments ?? 0);
      const denominator = input.video_views ?? 0;
      if (denominator <= 0) return 0;
      return parseFloat(((numerator / denominator) * 100).toFixed(2));
    }
    default:
      return 0;
  }
}

/**
 * Create or update monthly metrics (admin only)
 */
export async function upsertSocialMetrics(
  input: CreateSocialMonthlyMetricsInput
): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Validate input
  if (!input.month || !input.platform) {
    return { success: false, error: 'Month and platform are required' };
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(input.month)) {
    return { success: false, error: 'Invalid month format. Use YYYY-MM' };
  }

  const validPlatforms = METRICS_PLATFORMS;
  if (!validPlatforms.includes(input.platform)) {
    return { success: false, error: 'Invalid platform' };
  }

  if (input.followers_total < 0) {
    return { success: false, error: 'Followers cannot be negative' };
  }

  // 3. Auto-calculate monthly engagement rate
  const inputWithRate: CreateSocialMonthlyMetricsInput = {
    ...input,
    total_engagement_rate: calculateMonthlyEngagementRate(input),
  };

  // 4. Upsert via service
  const result = await socialMetricsService.upsert(inputWithRate);

  if (result.error || !result.metrics) {
    return { success: false, error: result.error || 'Failed to save metrics' };
  }

  // 4. Revalidate
  revalidatePath('/social');

  return { success: true };
}

/**
 * Create or update monthly note (admin only)
 */
export async function upsertMonthlyNote(
  month: string,
  notes: string
): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    return { success: false, error: 'Invalid month format' };
  }

  const result = await socialMetricsService.upsertNote(month, notes);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

/**
 * Create or update a social goal (admin only)
 */
export async function upsertSocialGoal(
  input: CreateSocialGoalInput
): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  if (!input.month || !input.platform || !input.metric_key || input.target_value <= 0) {
    return { success: false, error: 'Invalid goal data' };
  }

  const result = await socialMetricsService.upsertGoal(input);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

/**
 * Delete a social goal (admin only)
 */
export async function deleteSocialGoal(id: string): Promise<ActionResult> {
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  const result = await socialMetricsService.deleteGoal(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/social');
  return { success: true };
}

// =============================================================================
// CSV Parsing
// =============================================================================

/** CSV satırını virgül/noktalı virgüle duyarlı, tırnak-bilinçli şekilde böler */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Sayısal string → number; binlik ayraç (nokta/virgül) ve BOM karakteri temizlenir */
function toNum(s: string): number {
  const cleaned = s.replace(/﻿/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Header dizisinde birden fazla olası isimle sütun arar.
 * Kısmi eşleşme (includes) destekler.
 */
function findCol(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

// ── Platform parserleri ───────────────────────────────────────────────────────

function parseTwitchKickCsv(lines: string[]): Record<string, number> {
  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim());
  const dataLines = lines.slice(1).filter(l => l.trim());

  const colAvg     = findCol(headers, ['average viewers', 'concurrent viewers (average)', 'avg viewers']);
  const colPeak    = findCol(headers, ['peak viewers', 'concurrent viewers (peak)', 'peak_viewers']);
  const colHrsWatched = findCol(headers, ['hours watched', 'hours_watched']);
  const colMinWatched = findCol(headers, ['minutes watched']);
  const colHrsStreamed = findCol(headers, ['hours streamed', 'stream hours', 'duration (hours)']);
  const colMinStreamed = findCol(headers, ['minutes streamed', 'stream minutes', 'duration (minutes)']);
  const colUniqueViewers = findCol(headers, ['unique viewers', 'unique_viewers']);

  let sumAvg = 0, maxPeak = 0, totalLiveViews = 0, totalStreamMinutes = 0, rowCount = 0;

  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    if (cols.length < 2) continue;
    rowCount++;

    if (colAvg >= 0)  sumAvg += toNum(cols[colAvg] ?? '0');
    if (colPeak >= 0) { const v = toNum(cols[colPeak] ?? '0'); if (v > maxPeak) maxPeak = v; }

    if (colHrsWatched >= 0)  totalLiveViews  += toNum(cols[colHrsWatched] ?? '0') * 60;  // hrs → mins as proxy
    if (colMinWatched >= 0)  totalLiveViews  += toNum(cols[colMinWatched] ?? '0');
    if (colUniqueViewers >= 0 && colHrsWatched < 0 && colMinWatched < 0) {
      totalLiveViews += toNum(cols[colUniqueViewers] ?? '0');
    }

    if (colHrsStreamed >= 0) totalStreamMinutes += toNum(cols[colHrsStreamed] ?? '0') * 60;
    if (colMinStreamed >= 0) totalStreamMinutes += toNum(cols[colMinStreamed] ?? '0');
  }

  const out: Record<string, number> = {};
  if (rowCount > 0 && colAvg >= 0)      out.avg_viewers = Math.round(sumAvg / rowCount);
  if (colPeak >= 0)                      out.peak_viewers = maxPeak;
  if (totalLiveViews > 0)                out.live_views = Math.round(totalLiveViews);
  if (totalStreamMinutes > 0)            out.total_stream_time_minutes = Math.round(totalStreamMinutes);
  return out;
}

function parseYouTubeCsv(lines: string[]): Record<string, number> {
  const out: Record<string, number> = {};

  // YouTube Studio'nun iki farklı CSV formatı vardır:
  // 1) Sütun başlıklı tablo (ilk satır: Date, Views, Watch time, ...)
  // 2) Satır-başlıklı özet (Content, Value — tek değer satırları)

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const isTableFormat = headers.length > 2 && (
    headers.includes('views') || headers.some(h => h.includes('view'))
  );

  if (isTableFormat) {
    // Tablo formatı: tüm satırları topla
    const colViews   = findCol(headers, ['views']);
    const colWatch   = findCol(headers, ['watch time (hours)', 'watch time', 'hours watched']);
    const colSubs    = findCol(headers, ['subscribers', 'subscribers gained', 'net subscribers']);
    const colSubsGained = findCol(headers, ['subscribers gained', 'subscriber gains']);

    let sumViews = 0, sumWatchMins = 0, sumSubsGained = 0, sumSubsTotal = 0;
    for (const line of lines.slice(1)) {
      const cols = splitCsvLine(line);
      if (cols.length < 2) continue;
      if (colViews >= 0)  sumViews     += toNum(cols[colViews] ?? '0');
      if (colWatch >= 0)  sumWatchMins += toNum(cols[colWatch] ?? '0') * 60; // hrs → mins
      if (colSubsGained >= 0) sumSubsGained += toNum(cols[colSubsGained] ?? '0');
      else if (colSubs >= 0)  sumSubsTotal  += toNum(cols[colSubs] ?? '0');
    }

    if (sumViews > 0)      out.video_views = Math.round(sumViews);
    if (sumWatchMins > 0)  out.watch_time_minutes_yt = Math.round(sumWatchMins);
    if (sumSubsGained > 0) out.subscribers_gained = Math.round(sumSubsGained);
    else if (sumSubsTotal > 0) out.subscribers_total = Math.round(sumSubsTotal);
  } else {
    // Özet formatı: her satır "Metrik Adı, Değer"
    for (const line of lines.slice(1)) {
      const cols = splitCsvLine(line);
      if (cols.length < 2) continue;
      const key = cols[0].toLowerCase().trim();
      const val = toNum(cols[cols.length - 1] ?? '0');

      if (key.includes('view'))              out.video_views = val;
      else if (key.includes('watch time'))   out.watch_time_minutes_yt = Math.round(val * 60);
      else if (key.includes('subscriber') && key.includes('gained')) out.subscribers_gained = val;
      else if (key.includes('subscriber'))   out.subscribers_total = val;
      else if (key.includes('like'))         out.total_likes = val;
      else if (key.includes('comment'))      out.total_comments = val;
    }
  }
  return out;
}

function parseInstagramCsv(lines: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  const colReach       = findCol(headers, ['reach', 'accounts reached', 'erişim']);
  const colImpressions = findCol(headers, ['impressions', 'gösterim', 'views']);
  const colFollowers   = findCol(headers, ['followers', 'follower count', 'takipçi']);
  const colFollowerGain= findCol(headers, ['followers gained', 'new followers', 'follower gains']);
  const colLikes       = findCol(headers, ['likes', 'beğeni']);
  const colComments    = findCol(headers, ['comments', 'yorum']);
  const colShares      = findCol(headers, ['shares', 'paylaşım']);
  const colSaves       = findCol(headers, ['saves', 'kaydetme']);

  let sumReach = 0, sumImpressions = 0, sumFollowerGain = 0, maxFollowers = 0;
  let sumLikes = 0, sumComments = 0, sumShares = 0, sumSaves = 0;

  // Satır-bazlı özet formatı kontrolü
  if (headers.length <= 2) {
    for (const line of lines.slice(1)) {
      const cols = splitCsvLine(line);
      if (cols.length < 2) continue;
      const key = cols[0].toLowerCase().trim();
      const val = toNum(cols[cols.length - 1] ?? '0');
      if (key.includes('reach') || key.includes('erişim'))          out.reach = val;
      else if (key.includes('impression') || key.includes('göster')) out.impressions = val;
      else if (key.includes('follower'))                              out.followers_gained = val;
    }
    return out;
  }

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    if (cols.length < 2) continue;
    if (colReach >= 0)        sumReach        += toNum(cols[colReach] ?? '0');
    if (colImpressions >= 0)  sumImpressions  += toNum(cols[colImpressions] ?? '0');
    if (colFollowerGain >= 0) sumFollowerGain += toNum(cols[colFollowerGain] ?? '0');
    if (colFollowers >= 0)    { const v = toNum(cols[colFollowers] ?? '0'); if (v > maxFollowers) maxFollowers = v; }
    if (colLikes >= 0)        sumLikes        += toNum(cols[colLikes] ?? '0');
    if (colComments >= 0)     sumComments     += toNum(cols[colComments] ?? '0');
    if (colShares >= 0)       sumShares       += toNum(cols[colShares] ?? '0');
    if (colSaves >= 0)        sumSaves        += toNum(cols[colSaves] ?? '0');
  }

  if (sumReach > 0)        out.reach = Math.round(sumReach);
  if (sumImpressions > 0)  out.impressions = Math.round(sumImpressions);
  if (sumFollowerGain > 0) out.followers_gained = Math.round(sumFollowerGain);
  else if (maxFollowers > 0) out.followers_total = maxFollowers;
  if (sumLikes > 0)        out.likes = Math.round(sumLikes);
  if (sumComments > 0)     out.comments = Math.round(sumComments);
  if (sumShares > 0)       out.shares = Math.round(sumShares);
  if (sumSaves > 0)        out.saves = Math.round(sumSaves);
  return out;
}

function parseXCsv(lines: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  const colImpressions = findCol(headers, ['impressions', 'tweet impressions']);
  const colLikes       = findCol(headers, ['likes', 'favorites']);
  const colRetweets    = findCol(headers, ['retweets']);
  const colReplies     = findCol(headers, ['replies']);
  const colProfileVisits = findCol(headers, ['user profile clicks', 'profile visits', 'profile clicks']);
  const colLinkClicks  = findCol(headers, ['url clicks', 'link clicks']);
  const colEngRate     = findCol(headers, ['engagement rate', 'engagements']);

  let sumImp = 0, sumLikes = 0, sumRT = 0, sumReplies = 0, sumProfile = 0, sumLinks = 0, sumEng = 0;

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    if (cols.length < 2) continue;
    if (colImpressions >= 0)   sumImp     += toNum(cols[colImpressions] ?? '0');
    if (colLikes >= 0)         sumLikes   += toNum(cols[colLikes] ?? '0');
    if (colRetweets >= 0)      sumRT      += toNum(cols[colRetweets] ?? '0');
    if (colReplies >= 0)       sumReplies += toNum(cols[colReplies] ?? '0');
    if (colProfileVisits >= 0) sumProfile += toNum(cols[colProfileVisits] ?? '0');
    if (colLinkClicks >= 0)    sumLinks   += toNum(cols[colLinkClicks] ?? '0');
    if (colEngRate >= 0)       sumEng     += toNum(cols[colEngRate] ?? '0');
  }

  if (sumImp > 0)     out.impressions    = Math.round(sumImp);
  if (sumLikes > 0)   out.likes          = Math.round(sumLikes);
  if (sumRT > 0)      out.retweets       = Math.round(sumRT);
  if (sumReplies > 0) out.replies        = Math.round(sumReplies);
  if (sumProfile > 0) out.profile_visits = Math.round(sumProfile);
  if (sumLinks > 0)   out.link_clicks    = Math.round(sumLinks);
  if (sumEng > 0 && sumImp > 0) out.engagement_rate = parseFloat(((sumEng / sumImp) * 100).toFixed(2));
  return out;
}

/**
 * Aylık platform CSV'sini ayrıştırır ve form alanlarına karşılık gelen değerleri döner.
 * Kullanıcının seçtiği platform'a göre ilgili parser çalışır.
 * Server action olarak tanımlanmıştır — CSV metni client'tan string olarak iletilir.
 */
export async function parseChannelMonthlyCSV(
  csvText: string,
  platform: string,
): Promise<{ success: boolean; data?: Record<string, number>; error?: string }> {
  if (!csvText.trim()) return { success: false, error: 'CSV boş.' };

  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { success: false, error: 'CSV en az iki satır içermelidir (başlık + veri).' };

  const pl = platform.toUpperCase();
  let data: Record<string, number>;

  try {
    if (pl === 'TWITCH' || pl === 'KICK')  data = parseTwitchKickCsv(lines);
    else if (pl === 'YOUTUBE')              data = parseYouTubeCsv(lines);
    else if (pl === 'INSTAGRAM')            data = parseInstagramCsv(lines);
    else if (pl === 'X')                    data = parseXCsv(lines);
    else return { success: false, error: `Desteklenmeyen platform: ${platform}` };
  } catch {
    return { success: false, error: 'CSV ayrıştırma hatası — format desteklenmiyor olabilir.' };
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: 'CSV\'den tanınan sütun bulunamadı. Format farklı olabilir.' };
  }

  return { success: true, data };
}

/**
 * Delete monthly metrics (admin only)
 */
export async function deleteSocialMetrics(id: string): Promise<ActionResult> {
  // 1. Verify admin
  const { isAdmin, error: adminError } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: adminError };
  }

  // 2. Delete via service
  const result = await socialMetricsService.delete(id);

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to delete metrics' };
  }

  // 3. Revalidate
  revalidatePath('/social');

  return { success: true };
}
