// Sabitler ve tipler — client/server her ikisi de import edebilir (next/headers yok)

export type ContentPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'TWITCH' | 'X';
export type ContentStatus   = 'HAZIRLANIYOR' | 'HAZIR' | 'YAYINLANDI';

export interface ContentQueueItem {
  id: string;
  title: string;
  platforms: ContentPlatform[];
  content_type: string;
  status: ContentStatus;
  content_text: string | null;
  voice_url: string | null;
  video_url: string | null;
  has_text: boolean;
  has_voice: boolean;
  has_video: boolean;
  planned_date: string | null;
  published_date: string | null;
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  voiced_by: string | null;
  edited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentQueueInput {
  title: string;
  platforms: ContentPlatform[];
  content_type: string;
  status?: ContentStatus;
  content_text?: string | null;
  voice_url?: string | null;
  video_url?: string | null;
  has_text?: boolean;
  has_voice?: boolean;
  has_video?: boolean;
  planned_date?: string | null;
  notes?: string | null;
  created_by: string;
  /** Formda seslendiren seçildiyse kart doğrudan ona atanır. */
  assigned_to?: string | null;
}

export interface UpdateContentQueueInput {
  title?: string;
  platforms?: ContentPlatform[];
  content_type?: string;
  status?: ContentStatus;
  content_text?: string | null;
  voice_url?: string | null;
  video_url?: string | null;
  has_text?: boolean;
  has_voice?: boolean;
  has_video?: boolean;
  planned_date?: string | null;
  published_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  voiced_by?: string | null;
  edited_by?: string | null;
}

// Tüm platformlarda geçerli genel format tipleri
export const CONTENT_FORMATS = [
  'Video',
  'Short / Reels',
  'Gönderi / Post',
  'Tweet / Thread',
  'Canlı Yayın',
  'Hikaye / Story',
] as const;

export const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  YOUTUBE:   'YouTube',
  INSTAGRAM: 'Instagram',
  TIKTOK:    'TikTok',
  TWITCH:    'Twitch',
  X:         'X (Twitter)',
};

/**
 * Where a card can be published. `auto` platforms have an API integration, so
 * their metrics are resolved live and must not be typed in by hand.
 */
export const PUBLISH_PLATFORMS: { value: ContentPlatform; label: string; auto: boolean }[] = [
  { value: 'YOUTUBE',   label: 'YouTube',   auto: true  },
  { value: 'INSTAGRAM', label: 'Instagram', auto: true  },
  { value: 'TIKTOK',    label: 'TikTok',    auto: false },
  { value: 'X',         label: 'X (Twitter)', auto: false },
  { value: 'TWITCH',    label: 'Twitch',    auto: false },
];

/**
 * One platform a card was published to.
 *
 * Everything below `comments` is optional: those columns arrive with the
 * publication-impact migration, and the fields stay undefined for API platforms
 * (YouTube / Instagram), whose numbers are resolved live.
 */
export interface PublicationInput {
  platform: ContentPlatform;
  url: string | null;
  external_id: string | null;
  /** Only for platforms without an API integration (TikTok / X / Twitch). */
  views: number | null;
  likes: number | null;
  comments: number | null;
  /**
   * X: gösterim sayısı. A view is NOT an impression — kept apart so the two
   * never get summed into the same total.
   */
  impressions?: number | null;
  shares?: number | null;
  saves?: number | null;
  followers_gained?: number | null;
  /**
   * Yayın ANI — tarih + saat, ISO/UTC olarak saklanır (TIMESTAMPTZ).
   * Ölçüm noktaları (24 saat / 7 gün / 30 gün) buna göre hesaplandığı için saat
   * önemlidir. Boşsa kartın published_date'ine düşer.
   */
  published_at?: string | null;
  /** Platform-specific title, when it differs from the card title. */
  title?: string | null;
}

/**
 * Veritabanı satırı → PublicationInput.
 *
 * Alan listesi bilerek TİPİN HEMEN YANINDA: bu eşleme sayfa içinde elle
 * yazıldığında yeni eklenen metrikler (paylaşım, kaydetme, takipçi, yayın anı)
 * sessizce düşüyordu — modal onları boş gösteriyor, sonraki kayıt da boş
 * yazıp veriyi siliyordu. Tek yerden geçince yeni bir alan eklemek yeterli.
 */
export function toPublicationInput(row: Record<string, unknown>): PublicationInput {
  const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));
  const str = (v: unknown): string | null => (v == null ? null : String(v));
  return {
    platform: row.platform as ContentPlatform,
    url: str(row.url),
    external_id: str(row.external_id),
    views: num(row.views),
    likes: num(row.likes),
    comments: num(row.comments),
    impressions: num(row.impressions),
    shares: num(row.shares),
    saves: num(row.saves),
    followers_gained: num(row.followers_gained),
    published_at: str(row.published_at),
    title: str(row.title),
  };
}

/** Elle girilen platformların metrik alanları — tek kaynak, modal bunu kullanır. */
export const MANUAL_METRIC_FIELDS = [
  { key: 'views',            label: 'İzlenme',  hint: 'Gerçek video izlenmesi' },
  { key: 'impressions',      label: 'Gösterim', hint: 'X impressions — izlenme ile toplanmaz' },
  { key: 'likes',            label: 'Beğeni',   hint: null },
  { key: 'comments',         label: 'Yorum',    hint: null },
  { key: 'shares',           label: 'Paylaşım', hint: 'Paylaşım / repost' },
  { key: 'saves',            label: 'Kaydetme', hint: 'Kaydetme / bookmark' },
  { key: 'followers_gained', label: 'Takipçi',  hint: 'Bu içerikten gelen takipçi' },
] as const;

export type ManualMetricField = (typeof MANUAL_METRIC_FIELDS)[number]['key'];

// ── Yayın anı ⇄ <input type="datetime-local"> dönüşümü ──────────────────────
// Tarayıcı yerel saat verir/bekler, veritabanı UTC saklar. Dönüşüm tek yerde
// olsun ki bir tarafta saat kayması olmasın.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Saklanan ISO anı → datetime-local girdisinin beklediği yerel "YYYY-MM-DDTHH:mm". */
export function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * datetime-local değeri → saklanacak ISO an.
 * Değer yerel saat olarak yorumlanır (Date yapıcısının zonesuz string davranışı),
 * böylece "01.08.2026 21:00" girişi gerçekten 21:00'i işaret eder.
 */
export function fromLocalDateTimeInput(local: string): string | null {
  const s = local.trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Instagram permalinks are /p/{shortcode}/ or /reel/{shortcode}/. */
export function extractInstagramShortcode(input: string): string | null {
  const m = input.trim().match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  HAZIRLANIYOR: 'Hazırlanıyor',
  HAZIR:        'Hazır',
  YAYINLANDI:   'Yayınlandı',
};

// ── Pipeline stage (derived) + role responsibility ──────────────────────────
// Same derivation as the İçerik Planı kanban. Used to auto-surface content on
// each member's profile by the role responsible for the current stage.

export type ContentStage = 'METIN' | 'SES' | 'EDITOR' | 'HAZIR' | 'YAYINLANDI';

export const STAGE_LABELS_MAP: Record<ContentStage, string> = {
  METIN:      'Metin Yazılıyor',
  SES:        'Ses Bekleniyor',
  EDITOR:     'Editörde',
  HAZIR:      'Hazır',
  YAYINLANDI: 'Yayınlandı',
};

// ── Takip: is ne kadar bekliyor, gecikti mi ─────────────────────────────────
// Takip merkezinin asil sorusu "hangi is takildi". Asama kimde oldugunu
// soyler; bu iki olcu ne kadar suredir orada durdugunu soyler.

/** Bir günün milisaniyesi. */
const DAY_MS = 86_400_000;

/**
 * Kart en son hareket ettiğinden beri geçen tam gün sayısı.
 *
 * Hareket = updated_at. Her aşama geçişi, atama ve düzenleme bunu günceller,
 * yani "3 gündür Ses Bekleniyor'da duruyor" cümlesinin dayanağı bu.
 * Gelecek bir tarih için 0 döner (saat farkından negatif gün çıkmasın).
 */
export function daysWaiting(updatedAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!updatedAt) return null;
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

export type StaleLevel = 'OK' | 'WARN' | 'LATE';

/** Bir haftadır duran iş dikkat çeker, iki haftadır duran iş geç kalmıştır. */
export function staleLevel(days: number | null): StaleLevel {
  if (days === null) return 'OK';
  if (days >= 14) return 'LATE';
  if (days >= 7) return 'WARN';
  return 'OK';
}

/**
 * Planlanan yayın günü geçmiş ama içerik hâlâ yayınlanmamış mı.
 * Yayınlanan içerik için gecikme kavramı yoktur.
 */
export function isOverdue(
  plannedDate: string | null | undefined,
  stage: ContentStage,
  today: string
): boolean {
  if (!plannedDate || stage === 'YAYINLANDI') return false;
  return plannedDate < today;
}

/** Aşamaların hat sırası — pano kolonları ve liste sıralaması bunu kullanır. */
export const STAGE_ORDER: ContentStage[] = ['METIN', 'SES', 'EDITOR', 'HAZIR', 'YAYINLANDI'];

export interface StageStyle {
  color: string;
  bg: string;
  borderColor: string;
}

/**
 * Aşama renkleri — pano ve liste aynı renkleri kullanır.
 *
 * Tek kaynak olması önemli: iki görünüm aynı işi farklı renkte gösterirse
 * "hangisi doğru" sorusu çıkar. Renkler panonun özgün renkleri.
 */
export const STAGE_STYLES: Record<ContentStage, StageStyle> = {
  METIN:      { color: '#EAB308', bg: 'rgba(234,179,8,0.07)',   borderColor: 'rgba(234,179,8,0.25)' },
  SES:        { color: '#3B82F6', bg: 'rgba(59,130,246,0.07)',  borderColor: 'rgba(59,130,246,0.25)' },
  EDITOR:     { color: '#9146FF', bg: 'rgba(145,70,255,0.07)',  borderColor: 'rgba(145,70,255,0.25)' },
  HAZIR:      { color: '#22C55E', bg: 'rgba(34,197,94,0.07)',   borderColor: 'rgba(34,197,94,0.25)' },
  YAYINLANDI: { color: '#6B6B6B', bg: 'rgba(107,107,107,0.05)', borderColor: 'rgba(107,107,107,0.2)' },
};

/** Aşamayı ileri taşıyan düğmenin metni. */
export const STAGE_ADVANCE_LABELS: Record<ContentStage, string> = {
  METIN:      'Metin Tamam →',
  SES:        'Ses Atıldı →',
  EDITOR:     'Video Hazır →',
  HAZIR:      'Yayınlandı ✓',
  YAYINLANDI: '',
};

/**
 * Bu aşamada ileri taşınacak bir adım var mı. Yayınlanan içerik hattın sonu.
 */
export function canAdvanceStage(stage: ContentStage): boolean {
  return stage !== 'YAYINLANDI';
}

/**
 * İleri taşımak için bu aşamada neyin girilmesi gerekir.
 *
 * Liste görünümü buna bakarak satır içinde düğme mi göstereceğine, yoksa
 * satırı açıp kutu mu isteyeceğine karar verir.
 */
export type StageRequirement = 'ASSIGNEE' | 'LINK' | 'PUBLISH' | null;

export function stageRequirement(stage: ContentStage): StageRequirement {
  if (stage === 'METIN')  return 'ASSIGNEE'; // seslendirecek kişi seçilmeli
  if (stage === 'SES')    return 'LINK';     // ses linki
  if (stage === 'EDITOR') return 'LINK';     // video linki
  if (stage === 'HAZIR')  return 'PUBLISH';  // yayın bilgileri (modal)
  return null;
}

export function deriveStage(item: Pick<ContentQueueItem, 'status' | 'has_text' | 'has_voice' | 'has_video'>): ContentStage {
  if (item.status === 'YAYINLANDI') return 'YAYINLANDI';
  if (item.has_video) return 'HAZIR';
  if (item.has_voice) return 'EDITOR';
  if (item.has_text) return 'SES';
  return 'METIN';
}

/**
 * Pull the 11-char video id out of any YouTube URL form (watch?v=, youtu.be/,
 * /shorts/, /live/), or accept a bare id. Returns null when nothing matches.
 */
export function extractYouTubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * Yayın linkinden yayın kaydı kurar — elle sayı girmeden.
 *
 * Yayınlamak iki işi birden yapar: kartı kapatır ve seslendirme/kurgu iş
 * kalemlerini açar (ödeme tarafı oradan besleniyor). Ama eski yayın ekranı
 * bunun için platform platform metrik girmeyi istiyordu. Gerekli olan tek şey
 * linkte zaten var: platform ve içeriğin kimliği. Kimlik yazılınca YouTube ve
 * Instagram sayıları senkrondan kendiliğinden geliyor.
 *
 * Link tanınmazsa ve kartın tek platformu varsa o platforma linksiz-kimliksiz
 * bir kayıt yazılır (hangi platformda yayınlandığı bilgisi korunur). Link boşsa
 * hiç kayıt yazılmaz: kart yine kapanır, iş kalemleri yine açılır.
 */
export function publicationsFromUrl(
  url: string | null | undefined,
  cardPlatforms: ContentPlatform[]
): PublicationInput[] {
  const link = url?.trim();
  if (!link) return [];

  const base = { views: null, likes: null, comments: null };

  const youtubeId = extractYouTubeId(link);
  // Çıplak 11 karakterlik kimlik de YouTube sayılır, ama yalnızca bağlantı
  // gerçekten YouTube'u gösteriyorsa: başka platformun linkinde 11 karakterlik
  // bir parça yakalanıp YouTube'a yazılmasın.
  const looksYouTube = /youtu\.?be/i.test(link) || link === youtubeId;
  if (youtubeId && looksYouTube) {
    return [{ platform: 'YOUTUBE', url: link, external_id: youtubeId, ...base }];
  }

  const igCode = extractInstagramShortcode(link);
  if (igCode) {
    return [{ platform: 'INSTAGRAM', url: link, external_id: igCode, ...base }];
  }

  if (/tiktok\.com/i.test(link))            return [{ platform: 'TIKTOK',  url: link, external_id: null, ...base }];
  if (/(?:^|\/\/|\.)(?:x|twitter)\.com/i.test(link)) return [{ platform: 'X', url: link, external_id: null, ...base }];
  if (/twitch\.tv/i.test(link))             return [{ platform: 'TWITCH',  url: link, external_id: null, ...base }];

  // Tanınmayan link: kartın tek platformu varsa ona yaz, birden fazlaysa
  // hangisi olduğunu uydurmak yerine kayıt yazmayız.
  if (cardPlatforms.length === 1) {
    return [{ platform: cardPlatforms[0], url: link, external_id: null, ...base }];
  }
  return [];
}

/** Roles that may write/edit content cards and hand off the Metin stage. */
export const CONTENT_EDITOR_ROLES = ['ADMIN', 'PUBLISHER', 'YOUTUBER'] as const;

/** Which pipeline stages a given user role is responsible for. */
export const ROLE_STAGES: Record<string, ContentStage[]> = {
  PUBLISHER: ['METIN'],   // metni yazan
  YOUTUBER:  ['METIN'],   // metni yazan + seslendirmen atayan
  VOICE:     ['SES'],     // seslendiren
  EDITOR:    ['EDITOR'],  // kurgulayan
};

/**
 * "Seslendirme senden bekleniyor" bildirimi.
 *
 * Üç yerden gönderilir: yeni içerik formunda seslendiren seçildiğinde, kartın
 * seslendireni değiştirildiğinde ve panoda Metin→Ses teslimi yapıldığında.
 * Metin tek yerde dursun ki üçü ayrışmasın.
 */
export function voiceRequestNotification(title: string): { title: string; body: string } {
  return {
    title: '🎙 Seslendirme senden bekleniyor',
    body: `Metin hazır. "${title}" için sesi kaydedip linkini yükle.`,
  };
}

/**
 * Formdan gelen veri hatta nasıl düşer.
 *
 * "Metni yaz, seçtiğin kişiye gitsin" akışının kuralı burada: metin VE kişi
 * doluysa kart Metin adımını atlayıp doğrudan "Ses Bekleniyor"da açılır ve o
 * kişiye bildirim gider. İkisinden biri eksikse kart taslak kalır — metni
 * olmayan bir kartı seslendirmene göndermek onu boş yere uyandırmak olurdu.
 */
export interface HandoffDecision {
  /** Kartın has_text değeri. */
  hasText: boolean;
  assignedTo: string | null;
  /** Seçilen kişiye bildirim gidecek mi. */
  notify: boolean;
  /** Gönderilemiyorsa nedeni — düğme metnini ve uyarıyı bu belirler. */
  blocked: 'NO_TEXT' | 'NO_PERSON' | null;
}

export function decideHandoff(input: {
  text: string | null | undefined;
  assigneeId: string | null | undefined;
  /** Formdaki "Metin yazıldı" kutusu — kişi seçilmediğinde geçerli kalır. */
  hasTextChecked?: boolean;
}): HandoffDecision {
  const hasBody = Boolean(input.text && input.text.trim());
  const person = input.assigneeId?.trim() || null;
  const fallback = { hasText: input.hasTextChecked ?? false, assignedTo: null, notify: false };

  if (!person)  return { ...fallback, blocked: 'NO_PERSON' };
  if (!hasBody) return { ...fallback, assignedTo: person, blocked: 'NO_TEXT' };
  return { hasText: true, assignedTo: person, notify: true, blocked: null };
}

export const PLATFORM_COLORS: Record<ContentPlatform, { bg: string; color: string }> = {
  YOUTUBE:   { bg: 'rgba(255,0,0,0.12)',    color: '#FF4444' },
  INSTAGRAM: { bg: 'rgba(225,48,108,0.12)', color: '#E1306C' },
  TIKTOK:    { bg: 'rgba(0,0,0,0.08)',      color: '#111111' },
  TWITCH:    { bg: 'rgba(145,70,255,0.12)', color: '#9146FF' },
  X:         { bg: 'rgba(161,161,161,0.12)',color: '#A1A1A1' },
};
