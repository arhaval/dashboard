import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  deriveStage,
  ROLE_STAGES,
  STAGE_LABELS_MAP,
  type ContentPlatform,
  type ContentStatus,
  type ContentQueueItem,
  type ContentStage,
  type CreateContentQueueInput,
  type UpdateContentQueueInput,
  toPublicationInput,
  type PublicationInput,
} from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import type { ScriptHandoff } from '@/app/(dashboard)/motor/voice-handoff.constants';

export type { ContentPlatform, ContentStatus, ContentQueueItem, CreateContentQueueInput, UpdateContentQueueInput };

/** A content item surfaced on a member's profile, with its current stage. */
export interface AssignedContent extends ContentQueueItem {
  stage: ContentStage;
  stage_label: string;
}

export const contentQueueService = {
  async getAll(filters?: {
    platform?: ContentPlatform;
    status?: ContentStatus;
  }): Promise<ContentQueueItem[]> {
    const supabase = await createClient();

    let query = supabase
      .from('content_queue')
      .select('*')
      .order('planned_date', { ascending: true, nullsFirst: false });

    if (filters?.platform) query = query.contains('platforms', [filters.platform]);
    if (filters?.status)   query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) {
      console.error('content_queue getAll error:', error.message);
      return [];
    }
    return (data || []) as ContentQueueItem[];
  },

  /**
   * Content items whose CURRENT pipeline stage is the responsibility of `role`
   * (Metin→PUBLISHER, Ses→VOICE, Editörde→EDITOR). Surfaced on member profiles.
   * Uses the admin client so non-admin roles (VOICE/EDITOR) can be shown their
   * queue on a page that already gates access to admin-or-self.
   */
  async getAssignedForRole(role: string): Promise<AssignedContent[]> {
    const stages = ROLE_STAGES[role];
    if (!stages) return [];

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('content_queue')
      .select('*')
      .neq('status', 'YAYINLANDI')
      .order('planned_date', { ascending: true, nullsFirst: false });
    if (error || !data) return [];

    return (data as ContentQueueItem[])
      .map((i) => ({ ...i, stage: deriveStage(i) }))
      .filter((i) => stages.includes(i.stage))
      .map((i) => ({ ...i, stage_label: STAGE_LABELS_MAP[i.stage] }));
  },

  /**
   * Content on a member's plate = cards assigned directly to them, PLUS the
   * role-owned stages EXCEPT "Ses" (which is assignment-only now). So a voice
   * person sees only the Ses cards assigned to them, not every Ses card.
   */
  async getAssignedForUser(userId: string, role: string): Promise<AssignedContent[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('content_queue')
      .select('*')
      .neq('status', 'YAYINLANDI')
      .order('planned_date', { ascending: true, nullsFirst: false });
    if (!data) return [];

    const stages = ROLE_STAGES[role] ?? [];
    return (data as ContentQueueItem[])
      .map((i) => ({ ...i, stage: deriveStage(i) }))
      .filter((i) => i.assigned_to === userId || (stages.includes(i.stage) && i.stage !== 'SES'))
      .map((i) => ({ ...i, stage_label: STAGE_LABELS_MAP[i.stage] }));
  },

  /** Replace a card's publication rows (one per platform it went out on). */
  /**
   * Bir kartın yayın satırlarını güncelle.
   *
   * ÖNEMLİ — neden sil-yeniden-yarat DEĞİL:
   * content_publication_metric_snapshots bu satırlara ON DELETE CASCADE ile
   * bağlı. Eskiden bu fonksiyon kartın bütün satırlarını silip yeniden
   * yaratıyordu; yani ölçüm noktalarını (24 saat / 7 gün / 30 gün) biriktirmek
   * için modalı her açıp kaydedişte o kartın BÜTÜN ölçüm geçmişi siliniyordu.
   * Tam olarak toplanmak istenen veri, toplama hareketiyle yok oluyordu.
   *
   * Artık UNIQUE(content_queue_id, platform) üzerinden upsert yapılıyor: satır
   * kimliği korunur, snapshot'lar bağlı kalır. Yalnızca gerçekten kaldırılan
   * platformların satırı silinir — o platformun geçmişinin gitmesi doğrudur,
   * çünkü artık o yayın yok.
   */
  async savePublications(cardId: string, rows: PublicationInput[]): Promise<{ error?: string }> {
    const admin = createAdminClient();

    // Artık işaretli olmayan platformların satırları (ve geçmişleri) gider.
    const keep = rows.map((r) => r.platform);
    const removal = admin.from('content_publications').delete().eq('content_queue_id', cardId);
    const { error: delError } = keep.length > 0
      ? await removal.not('platform', 'in', `(${keep.join(',')})`)
      : await removal;
    if (delError) return { error: delError.message };
    if (rows.length === 0) return {};

    const now = new Date().toISOString();
    const legacy = rows.map((r) => ({
      content_queue_id: cardId,
      platform: r.platform,
      url: r.url,
      external_id: r.external_id,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      updated_at: now,
    }));

    const onConflict = 'content_queue_id,platform';
    const { error } = await admin.from('content_publications').upsert(
      legacy.map((base, i) => ({
        ...base,
        impressions: rows[i].impressions ?? null,
        shares: rows[i].shares ?? null,
        saves: rows[i].saves ?? null,
        followers_gained: rows[i].followers_gained ?? null,
        published_at: rows[i].published_at ?? null,
        title: rows[i].title ?? null,
      })),
      { onConflict }
    );
    if (!error) return {};

    // Genişletilmiş metrik kolonları (impressions/shares/saves/...) ancak
    // 20260730_publication_impact_metrics migration'ı uygulandıktan sonra var.
    // Uygulanmadıysa yayın kaydetmeyi tamamen bloke etmek yerine eski şemayla
    // devam et — kullanıcı sayı girmediyse hiçbir veri kaybı olmaz.
    if (!/column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
      return { error: error.message };
    }
    const { error: legacyError } = await admin
      .from('content_publications')
      .upsert(legacy, { onConflict });
    return legacyError ? { error: legacyError.message } : {};
  },

  /**
   * `select('*')` bilinçli: yeni metrik kolonları migration'dan önce yoksa sorgu
   * hata vermek yerine o alanları döndürmez.
   */
  async getPublicationsForCards(cardIds: string[]): Promise<(PublicationInput & { content_queue_id: string })[]> {
    if (cardIds.length === 0) return [];
    const admin = createAdminClient();
    const { data } = await admin
      .from('content_publications')
      .select('*')
      .in('content_queue_id', cardIds);

    // Projeksiyon TEK yerde (toPublicationInput): çağıran taraf alan seçmesin,
    // yoksa yeni bir metrik eklendiğinde orada düşer ve kayıtta silinir.
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      ...toPublicationInput(row),
      content_queue_id: row.content_queue_id as string,
    }));
  },

  /**
   * When a pipeline card is published, copy its script onto the matching
   * video_performance / instagram_media row so it enters the content library
   * automatically (no manual re-paste).
   */
  async linkScriptToContent(publications: PublicationInput[], script: string | null): Promise<void> {
    if (!script || !script.trim()) return;
    const admin = createAdminClient();

    for (const p of publications) {
      if (p.platform === 'YOUTUBE' && p.external_id) {
        await admin.from('video_performance').update({ script }).eq('video_id', p.external_id);
      } else if (p.platform === 'INSTAGRAM' && p.external_id) {
        const { data } = await admin.from('instagram_media').select('media_id, permalink');
        const target = ((data ?? []) as { media_id: string; permalink: string | null }[])
          .find((m) => m.permalink?.includes(p.external_id as string));
        if (target) await admin.from('instagram_media').update({ script }).eq('media_id', target.media_id);
      }
    }
  },

  /**
   * Re-apply every published card's script to its library rows.
   *
   * linkScriptToContent runs at publish time, but a just-uploaded video has no
   * video_performance / instagram_media row yet — the sync hasn't seen it — so
   * the update silently matches nothing and the script never reaches the
   * library. Running this after each sync closes that gap: the card stays the
   * single source of truth and the library copy is derived from it.
   */
  async relinkPublishedScripts(): Promise<{ linked: number }> {
    const admin = createAdminClient();

    const { data: pubs } = await admin
      .from('content_publications')
      .select('platform, external_id, content_queue:content_queue_id(content_text)')
      .not('external_id', 'is', null);

    type Row = {
      platform: string;
      external_id: string;
      content_queue: { content_text: string | null } | null;
    };

    let linked = 0;
    for (const p of (pubs ?? []) as unknown as Row[]) {
      const script = p.content_queue?.content_text;
      if (!script?.trim()) continue;
      await this.linkScriptToContent(
        [{ platform: p.platform, external_id: p.external_id } as PublicationInput],
        script
      );
      linked += 1;
    }
    return { linked };
  },

  async getByIdAdmin(id: string): Promise<ContentQueueItem | null> {
    const admin = createAdminClient();
    const { data } = await admin.from('content_queue').select('*').eq('id', id).maybeSingle();
    return (data as ContentQueueItem) ?? null;
  },

  /** Update via admin client (bypasses RLS) — used for role-based stage handoff. */
  async updateAdmin(
    id: string,
    input: UpdateContentQueueInput
  ): Promise<{ item: ContentQueueItem | null; error?: string }> {
    const admin = createAdminClient();
    const payload: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
    if (input.status === 'YAYINLANDI' && !input.published_date) {
      payload.published_date = new Date().toISOString().split('T')[0];
    }
    const { data, error } = await admin.from('content_queue').update(payload).eq('id', id).select().single();
    if (error) return { item: null, error: error.message };
    return { item: data as ContentQueueItem };
  },

  /**
   * Motor'da onaylanan final metni hattın "Ses" adımına koyar.
   *
   * has_text=true + assigned_to dolu = kart doğrudan Ses kolonunda açılır;
   * metin zaten bitmiş, sıradaki iş seslendirme. Admin istemci kullanılır
   * çünkü çağıran Motor (admin-only) ve kart başkasına atanıyor.
   *
   * Aynı final iki kez gönderilmez: script_id zaten varsa mevcut kart döner.
   */
  async createFromScript(input: {
    scriptId: string;
    title: string;
    text: string;
    platforms: ContentPlatform[];
    contentType: string;
    assignedTo: string;
    plannedDate: string | null;
    notes: string | null;
    createdBy: string;
  }): Promise<{ item: ContentQueueItem | null; duplicate?: boolean; error?: string }> {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('content_queue')
      .select('*')
      .eq('script_id', input.scriptId)
      .maybeSingle();
    if (existing) return { item: existing as ContentQueueItem, duplicate: true };

    const { data, error } = await admin
      .from('content_queue')
      .insert({
        title: input.title,
        platforms: input.platforms,
        content_type: input.contentType,
        content_text: input.text,
        has_text: true,
        assigned_to: input.assignedTo,
        planned_date: input.plannedDate,
        notes: input.notes,
        script_id: input.scriptId,
        created_by: input.createdBy,
      })
      .select()
      .single();
    if (error) {
      // script_id kolonu migration uygulanmadan once yok. Hata mesaji
      // PostgREST dilinde geliyor; ne yapilacagini soyleyen bir karsilik ver.
      if (/script_id/.test(error.message)) {
        return { item: null, error: 'Veritabani guncellemesi bekliyor: 20261019_content_queue_script_link.sql' };
      }
      return { item: null, error: error.message };
    }
    return { item: data as ContentQueueItem };
  },

  /**
   * Motor listesinde her metnin teslim durumu — hangi aşamada ve ses linki
   * geldi mi. Ses linki Motor'da görünsün ki teslim alınırken İçerik Planı'na
   * geçmek gerekmesin.
   */
  async getHandoffsForScripts(scriptIds: string[]): Promise<Record<string, ScriptHandoff>> {
    if (scriptIds.length === 0) return {};
    const admin = createAdminClient();
    const { data } = await admin
      .from('content_queue')
      .select('id, script_id, status, has_text, has_voice, has_video, voice_url, assigned_to')
      .in('script_id', scriptIds);
    if (!data || data.length === 0) return {};

    type Row = Pick<ContentQueueItem,
      'id' | 'script_id' | 'status' | 'has_text' | 'has_voice' | 'has_video' | 'voice_url' | 'assigned_to'>;
    const rows = data as Row[];

    const assigneeIds = [...new Set(rows.map((r) => r.assigned_to).filter((v): v is string => Boolean(v)))];
    const names: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const { data: users } = await admin.from('users').select('id, full_name').in('id', assigneeIds);
      for (const u of (users ?? []) as { id: string; full_name: string }[]) names[u.id] = u.full_name;
    }

    const out: Record<string, ScriptHandoff> = {};
    for (const r of rows) {
      if (!r.script_id) continue;
      const stage = deriveStage(r);
      // METIN asamasi burada olusmaz (kart has_text=true ile dogar); tip
      // guvenligi icin yine de disarida tutulur.
      if (stage === 'METIN') continue;
      out[r.script_id] = {
        cardId: r.id,
        stage,
        voiceUrl: r.voice_url,
        assigneeName: r.assigned_to ? names[r.assigned_to] ?? null : null,
      };
    }
    return out;
  },

  async create(
    input: CreateContentQueueInput
  ): Promise<{ item: ContentQueueItem | null; error?: string }> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('content_queue')
      .insert(input)
      .select()
      .single();
    if (error) return { item: null, error: error.message };
    return { item: data as ContentQueueItem };
  },

  async update(
    id: string,
    input: UpdateContentQueueInput
  ): Promise<{ item: ContentQueueItem | null; error?: string }> {
    const supabase = await createClient();
    const payload: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    if (input.status === 'YAYINLANDI' && !input.published_date) {
      payload.published_date = new Date().toISOString().split('T')[0];
    }
    const { data, error } = await supabase
      .from('content_queue')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { item: null, error: error.message };
    return { item: data as ContentQueueItem };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase.from('content_queue').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
