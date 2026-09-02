/** İçerik Motoru — client-safe types, section keys & labels (no server imports). */

export type ScriptStatus = 'DRAFT' | 'AI_EDITED' | 'FINAL';
export type EnginePlatform = 'REELS' | 'SHORTS' | 'TIKTOK' | 'YOUTUBE_LONG' | 'X';
export type ReferenceSourceType = 'SRT' | 'TEXT' | 'VIDEO';

/** The prompt template revision — bump when the generation prompt changes so we
 *  can later tell which prompt shape produced which output. */
export const PROMPT_VERSION = 'v2';

/** Arhaval DNA sections (Layer 1) — the same keys stored in ai_dna.sections. */
export const DNA_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'voice',      label: 'Anlatıcı Sesi / Ton',   hint: 'Nasıl konuşuyoruz? "Biz" dili, samimiyet, iddia, jargon.' },
  // İskelet prompt'ta KENDİ bölümünde gösterilir (madde listesinde tekrarlanmaz);
  // boş bırakılırsa prompt varsayılan iskeleti yazar.
  { key: 'skeleton',           label: 'Metin İskeleti',            hint: 'Metnin değişmez sırası ve blok sayısı. Boş bırakılırsa varsayılan iskelet kullanılır.' },
  { key: 'voice_distribution', label: 'Anlatıcı Sesi Dağılımı',    hint: 'Hangi bölümde hangi ses baskın? Anlatıcı/yorumcu/aktarıcı dengesi metin boyunca nasıl değişiyor?' },
  { key: 'hook_logic', label: 'Hook Mantığı',          hint: 'İlk saniyelerde merak/gerilim nasıl kuruluyor?' },
  { key: 'rhythm',     label: 'Cümle Ritmi',           hint: 'Kısa/uzun cümle dengesi, tempo, nefes noktaları.' },
  { key: 'data_usage', label: 'Veri Kullanımı',        hint: 'Sayı/istatistik nasıl veriliyor, ne zaman?' },
  { key: 'payoff',     label: 'Payoff Mantığı',        hint: 'İzleyiciye vaat edilen ödül nasıl kapatılıyor?' },
  { key: 'cta',        label: 'CTA Yaklaşımı',         hint: 'Abone/yorum çağrısı nasıl, ne kadar dozda?' },
  { key: 'avoid',      label: 'Kaçınılacaklar',        hint: 'AI klişeleri, yasak kalıplar, asla yapılmayacaklar.' },
];

/** Format Playbook sections (Layer 2) — the same keys stored in ai_formats.playbook. */
export const PLAYBOOK_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'hook',     label: 'Hook',    hint: 'Bu formatta giriş nasıl kurulur.' },
  { key: 'thesis',   label: 'Tez',     hint: "Hook'un vaadini somutlaştıran tek cümle. Gövdenin neyi kanıtlayacağını söyler, gövdeyi özetlemez." },
  { key: 'body',     label: 'Gövde',   hint: 'Ana anlatının yapısı, sırası.' },
  { key: 'rhythm',   label: 'Ritim',   hint: 'Bu formata özel tempo.' },
  { key: 'evidence', label: 'Kanıt',   hint: 'Hangi kanıt/veri türü kullanılır.' },
  { key: 'payoff',   label: 'Payoff',  hint: 'Doruk / kapanış ödülü.' },
  { key: 'cta',      label: 'CTA',     hint: 'Bu formatta çağrı yaklaşımı.' },
];

export const STATUS_META: Record<ScriptStatus, { label: string; bg: string; color: string }> = {
  DRAFT:    { label: 'Taslak',    bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  AI_EDITED:{ label: 'AI Düzenledi', bg: 'var(--color-info-muted)', color: 'var(--color-info)' },
  FINAL:    { label: 'Final',     bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
};

export const PLATFORM_OPTIONS: { value: EnginePlatform; label: string }[] = [
  { value: 'REELS',        label: 'Instagram Reels' },
  { value: 'SHORTS',       label: 'YouTube Shorts' },
  { value: 'TIKTOK',       label: 'TikTok' },
  { value: 'YOUTUBE_LONG', label: 'YouTube (uzun video)' },
  { value: 'X',            label: 'X' },
];

export const PLATFORM_LABELS: Record<EnginePlatform, string> = {
  REELS: 'Instagram Reels',
  SHORTS: 'YouTube Shorts',
  TIKTOK: 'TikTok',
  YOUTUBE_LONG: 'YouTube (uzun video)',
  X: 'X',
};

/** Reels/Shorts-heavy channel → sensible default. */
export const DEFAULT_PLATFORM: EnginePlatform = 'REELS';

/** Target duration as choices, not free text — so it's usable as data later. */
export const DURATION_OPTIONS = ['30 sn', '45 sn', '60 sn', '90 sn', '2 dk'] as const;

/** Shown above every draft box — the engine's core safety contract. */
export const DRAFT_SAFETY_NOTE =
  'Bu metindeki bilgileri koruyacağız. AI yeni gerçek veya sana ait görüş uydurmayacak.';

export const SOURCE_TYPE_OPTIONS: { value: ReferenceSourceType; label: string }[] = [
  { value: 'SRT',  label: 'SRT / Altyazı' },
  { value: 'TEXT', label: 'Düz Metin' },
  { value: 'VIDEO', label: 'Video Dökümü' },
];

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface FormatDTO {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  version: number;
  playbook: Record<string, string>;
}

export interface DnaDTO {
  id: string;
  version: number;
  sections: Record<string, string>;
  updated_at: string;
}

export interface GenerationDTO {
  id: string;
  script_id: string;
  output_text: string;
  ai_notes: string[];
  dna_version: number | null;
  format_version: number | null;
  prompt_version: string | null;
  model: string | null;
  reference_ids: string[];
  gold_standard_script_ids: string[];
  created_at: string;
}

export interface FormatVersionDTO {
  version: number;
  playbook: Record<string, string>;
  created_at: string;
}

export interface ScriptDTO {
  id: string;
  title: string;
  topic: string | null;
  format_id: string | null;
  format_label: string | null;
  platform: EnginePlatform | null;
  target_duration: string | null;
  status: ScriptStatus;
  draft_text: string | null;
  source_facts: string | null;
  final_text: string | null;
  final_generation_id: string | null;
  created_at: string;
  updated_at: string;
  /** Only loaded on the detail view. */
  generations?: GenerationDTO[];
}

export interface ReferenceDTO {
  id: string;
  title: string;
  format_id: string | null;
  format_label: string | null;
  source_type: ReferenceSourceType;
  body: string;
  tags: string[];
  notes: string | null;
  use_in_retrieval: boolean;
  created_at: string;
}
