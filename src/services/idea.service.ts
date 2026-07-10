/**
 * Fikir Havuzu service. All access via the service-role admin client; privacy
 * (anonymous author, per-voter breakdown) is enforced HERE by role, never sent
 * to non-admins. Score estimate is grounded in real video_performance averages.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { classifyVideoGenre, VIDEO_GENRE_LABELS, type VideoGenre, type PerfLabel } from '@/app/(dashboard)/icerik-performansi/perf.constants';

type PerfLabelLike = PerfLabel;
import { videoPerformanceService } from '@/services/video-performance.service';
import { contentQueueService } from '@/services/content-queue.service';
import type {
  IdeaDTO, IdeaCategory, VoteType, VoteCounts, VoterDetail, SuggestPlatform,
  IdeaOutcome, PlatformOutcome,
} from '@/app/(dashboard)/fikir-havuzu/idea.constants';

export type { IdeaDTO, IdeaCategory, VoteType };

interface Caller { id: string; role: string }

interface IdeaRow {
  id: string; title: string; summary: string | null; category: IdeaCategory; status: IdeaDTO['status'];
  author_id: string | null; ai_comment: string | null; ai_score: number | null; ai_genre: string | null;
  content_queue_id: string | null; created_at: string;
  suggested_platforms: SuggestPlatform[] | null; suggested_format: string | null;
}
interface VoteRow { idea_id: string; voter_id: string; vote: VoteType }

function emptyCounts(): VoteCounts { return { up: 0, down: 0, unsure: 0 }; }

/**
 * For ideas whose content was published, resolve real performance per platform.
 * YouTube comes from video_performance, Instagram from instagram_media (matched
 * by permalink shortcode); TikTok / X / Twitch carry hand-entered numbers.
 */
async function resolveOutcomes(ideas: IdeaRow[]): Promise<Map<string, IdeaOutcome>> {
  const out = new Map<string, IdeaOutcome>();
  const cardIds = ideas.map((i) => i.content_queue_id).filter((v): v is string => Boolean(v));
  if (cardIds.length === 0) return out;

  const pubs = await contentQueueService.getPublicationsForCards(cardIds);
  if (pubs.length === 0) return out;

  const admin = createAdminClient();

  // YouTube: scored videos by id
  const ytIds = pubs.filter((p) => p.platform === 'YOUTUBE' && p.external_id).map((p) => p.external_id!);
  const scoredByVideo = new Map<string, { view_count: number; score: number | null; label: PerfLabelLike }>();
  if (ytIds.length > 0) {
    const scored = await videoPerformanceService.getAllScored();
    for (const v of scored) {
      if (ytIds.includes(v.video_id)) {
        scoredByVideo.set(v.video_id, { view_count: Number(v.view_count), score: v.score, label: v.label });
      }
    }
  }

  // Instagram: match stored permalink against the shortcode we captured
  const igCodes = pubs.filter((p) => p.platform === 'INSTAGRAM' && p.external_id).map((p) => p.external_id!);
  const igByCode = new Map<string, { views: number; likes: number }>();
  if (igCodes.length > 0) {
    const { data } = await admin.from('instagram_media').select('permalink, view_count, like_count');
    for (const m of (data ?? []) as { permalink: string | null; view_count: number | null; like_count: number }[]) {
      const code = igCodes.find((c) => m.permalink?.includes(c));
      if (code) igByCode.set(code, { views: Number(m.view_count ?? 0), likes: Number(m.like_count) });
    }
  }

  const byCard = new Map<string, PlatformOutcome[]>();
  for (const p of pubs) {
    const list = byCard.get(p.content_queue_id) ?? [];
    if (p.platform === 'YOUTUBE') {
      const v = p.external_id ? scoredByVideo.get(p.external_id) : undefined;
      list.push({ platform: p.platform, url: p.url, views: v ? v.view_count : null, likes: null, score: v?.score ?? null, label: v?.label ?? null });
    } else if (p.platform === 'INSTAGRAM') {
      const m = p.external_id ? igByCode.get(p.external_id) : undefined;
      list.push({ platform: p.platform, url: p.url, views: m && m.views > 0 ? m.views : null, likes: m ? m.likes : null, score: null, label: null });
    } else {
      list.push({ platform: p.platform, url: p.url, views: p.views ?? null, likes: p.likes ?? null, score: null, label: null });
    }
    byCard.set(p.content_queue_id, list);
  }

  for (const i of ideas) {
    const platforms = i.content_queue_id ? byCard.get(i.content_queue_id) : undefined;
    if (!platforms || platforms.length === 0) continue;
    const yt = platforms.find((p) => p.platform === 'YOUTUBE');
    out.set(i.id, {
      total_views: platforms.reduce((sum, p) => sum + (p.views ?? 0), 0),
      platforms,
      label: yt?.label ?? null,
      score: yt?.score ?? null,
    });
  }
  return out;
}

/** One of a member's ideas that reached production, with its real numbers. */
export interface AuthorIdeaStat {
  id: string;
  title: string;
  created_at: string;
  /** null while the content isn't published or wasn't linked to a platform. */
  outcome: IdeaOutcome | null;
}

export const ideaService = {
  /**
   * Ideas this person contributed that were approved into content, together
   * with how that content actually performed. Shown on their profile.
   */
  async getAuthorOutcomes(userId: string): Promise<AuthorIdeaStat[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ideas')
      .select('*')
      .eq('author_id', userId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    const ideas = (data as IdeaRow[]) ?? [];
    if (ideas.length === 0) return [];

    const outcomes = await resolveOutcomes(ideas);
    return ideas.map((i) => ({
      id: i.id,
      title: i.title,
      created_at: i.created_at,
      outcome: outcomes.get(i.id) ?? null,
    }));
  },

  async getAllForUser(user: Caller): Promise<IdeaDTO[]> {
    const admin = createAdminClient();
    const isAdmin = user.role === 'ADMIN';

    const [{ data: ideaData }, { data: voteData }, { data: userData }] = await Promise.all([
      admin.from('ideas').select('*').order('created_at', { ascending: false }),
      admin.from('idea_votes').select('idea_id, voter_id, vote'),
      isAdmin ? admin.from('users').select('id, full_name') : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

    const ideas = (ideaData as IdeaRow[]) ?? [];
    const votes = (voteData as VoteRow[]) ?? [];
    const nameById = new Map<string, string>();
    for (const u of (userData as { id: string; full_name: string }[]) ?? []) nameById.set(u.id, u.full_name);

    const countsByIdea = new Map<string, VoteCounts>();
    const myVoteByIdea = new Map<string, VoteType>();
    const votersByIdea = new Map<string, VoterDetail[]>();
    for (const v of votes) {
      const c = countsByIdea.get(v.idea_id) ?? emptyCounts();
      if (v.vote === 'UP') c.up += 1; else if (v.vote === 'DOWN') c.down += 1; else c.unsure += 1;
      countsByIdea.set(v.idea_id, c);
      if (v.voter_id === user.id) myVoteByIdea.set(v.idea_id, v.vote);
      if (isAdmin) {
        const arr = votersByIdea.get(v.idea_id) ?? [];
        arr.push({ name: nameById.get(v.voter_id) ?? 'Bilinmeyen', vote: v.vote });
        votersByIdea.set(v.idea_id, arr);
      }
    }

    // Close the loop: idea → content card → published video → performance.
    const outcomeByIdea = await resolveOutcomes(ideas);

    const dto = ideas.map((i): IdeaDTO => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      category: i.category,
      status: i.status,
      ai_comment: i.ai_comment,
      ai_score: i.ai_score,
      ai_genre: i.ai_genre,
      content_queue_id: i.content_queue_id,
      suggested_platforms: i.suggested_platforms ?? [],
      suggested_format: i.suggested_format,
      created_at: i.created_at,
      counts: countsByIdea.get(i.id) ?? emptyCounts(),
      my_vote: myVoteByIdea.get(i.id) ?? null,
      is_mine: i.author_id === user.id,
      outcome: outcomeByIdea.get(i.id) ?? null,
      author_name: isAdmin ? (i.author_id ? nameById.get(i.author_id) ?? '—' : '—') : null,
      voters: isAdmin ? (votersByIdea.get(i.id) ?? []) : null,
    }));

    // "En desteklenen üstte": olumlu ağırlıklı, sonra net (olumlu−olumsuz), sonra yeni.
    return dto.sort((a, b) => {
      if (b.counts.up !== a.counts.up) return b.counts.up - a.counts.up;
      const netA = a.counts.up - a.counts.down, netB = b.counts.up - b.counts.down;
      if (netB !== netA) return netB - netA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async create(input: {
    title: string; summary: string | null; category: IdeaCategory; authorId: string;
    suggestedPlatforms: SuggestPlatform[]; suggestedFormat: string | null;
  }): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ideas').insert({
      title: input.title, summary: input.summary, category: input.category, author_id: input.authorId, status: 'OPEN',
      suggested_platforms: input.suggestedPlatforms, suggested_format: input.suggestedFormat,
    });
    return error ? { error: error.message } : {};
  },

  /**
   * Edit an idea. If the title or summary actually changed, the stored AI
   * evaluation no longer describes this idea — clear it so it can be re-run.
   */
  async update(ideaId: string, input: {
    title: string; summary: string | null; category: IdeaCategory;
    suggestedPlatforms: SuggestPlatform[]; suggestedFormat: string | null;
  }): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const existing = await this.getRaw(ideaId);
    if (!existing) return { error: 'Fikir bulunamadı' };

    const textChanged =
      existing.title !== input.title || (existing.summary ?? '') !== (input.summary ?? '');

    const patch: Record<string, unknown> = {
      title: input.title,
      summary: input.summary,
      category: input.category,
      suggested_platforms: input.suggestedPlatforms,
      suggested_format: input.suggestedFormat,
      updated_at: new Date().toISOString(),
    };
    if (textChanged) {
      patch.ai_comment = null;
      patch.ai_score = null;
      patch.ai_genre = null;
      patch.evaluated_at = null;
    }

    const { error } = await admin.from('ideas').update(patch).eq('id', ideaId);
    return error ? { error: error.message } : {};
  },

  async vote(ideaId: string, voterId: string, vote: VoteType): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin
      .from('idea_votes')
      .upsert({ idea_id: ideaId, voter_id: voterId, vote, updated_at: new Date().toISOString() }, { onConflict: 'idea_id,voter_id' });
    return error ? { error: error.message } : {};
  },

  async remove(ideaId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ideas').delete().eq('id', ideaId);
    return error ? { error: error.message } : {};
  },

  async reject(ideaId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ideas').update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', ideaId);
    return error ? { error: error.message } : {};
  },

  /** Per-genre view averages from real data, for grounding the AI estimate. */
  async genreBenchmark(genre: VideoGenre): Promise<{ genreAvg: number; overallAvg: number; sample: number }> {
    const admin = createAdminClient();
    const { data } = await admin.from('video_performance').select('genre, view_count, title, content_type, duration_seconds');
    const rows = (data as { genre: string | null; view_count: number; title: string; content_type: string; duration_seconds: number }[]) ?? [];
    const watched = rows.filter((r) => Number(r.view_count) > 0);
    const overallAvg = watched.length ? watched.reduce((s, r) => s + Number(r.view_count), 0) / watched.length : 0;
    const inGenre = watched.filter((r) => (r.genre ?? classifyVideoGenre(r.title, r.content_type as 'video' | 'short' | 'live', r.duration_seconds)) === genre);
    const genreAvg = inGenre.length ? inGenre.reduce((s, r) => s + Number(r.view_count), 0) / inGenre.length : 0;
    return { genreAvg, overallAvg, sample: inGenre.length };
  },

  async saveEvaluation(ideaId: string, comment: string, score: number | null, genre: VideoGenre): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ideas')
      .update({ ai_comment: comment, ai_score: score, ai_genre: genre, evaluated_at: new Date().toISOString() })
      .eq('id', ideaId);
    return error ? { error: error.message } : {};
  },

  async getRaw(ideaId: string): Promise<IdeaRow | null> {
    const admin = createAdminClient();
    const { data } = await admin.from('ideas').select('*').eq('id', ideaId).maybeSingle();
    return (data as IdeaRow) ?? null;
  },

  /** Approve → create a content_queue card in the "Metin Yazılıyor" stage. */
  async approve(
    ideaId: string,
    adminId: string,
    transfer: { platforms: string[]; content_type: string }
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const idea = await this.getRaw(ideaId);
    if (!idea) return { error: 'Fikir bulunamadı' };
    if (idea.content_queue_id) return { error: 'Bu fikir zaten aktarıldı' };

    const noteParts = [idea.summary?.trim(), idea.ai_comment ? `AI: ${idea.ai_comment}` : null].filter(Boolean);
    const { data: cq, error: cqError } = await admin.from('content_queue').insert({
      title: idea.title,
      platforms: transfer.platforms,
      content_type: transfer.content_type,
      status: 'HAZIRLANIYOR',          // → "Metin Yazılıyor" stage
      created_by: adminId,
      notes: noteParts.join('\n\n') || null,
    }).select('id').single();
    if (cqError) return { error: cqError.message };

    const { error } = await admin.from('ideas')
      .update({ status: 'APPROVED', approved_by: adminId, content_queue_id: cq.id, updated_at: new Date().toISOString() })
      .eq('id', ideaId);
    if (error) {
      await admin.from('content_queue').delete().eq('id', cq.id); // roll back the orphan card
      return { error: error.message };
    }
    return {};
  },

  /** Genre mapping helper for the AI estimate (title + summary). */
  ideaGenre(title: string, summary: string | null): VideoGenre {
    return classifyVideoGenre(`${title} ${summary ?? ''}`.trim(), 'video', 0);
  },

  genreLabel(genre: VideoGenre): string {
    return VIDEO_GENRE_LABELS[genre];
  },
};
