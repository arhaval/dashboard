/** İçerik Motoru — client-safe types, section keys & labels (no server imports). */

export type ScriptStatus = 'DRAFT' | 'AI_EDITED' | 'FINAL';
export type EnginePlatform = 'REELS' | 'SHORTS' | 'TIKTOK' | 'YOUTUBE_LONG' | 'X';
export type ReferenceSourceType = 'SRT' | 'TEXT' | 'VIDEO';

/** The prompt template revision — bump when the generation prompt changes so we
 *  can later tell which prompt shape produced which output. */
export const PROMPT_VERSION = 'v5';

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
export const DURATION_OPTIONS = ['30 sn', '45 sn', '60 sn', '90 sn', '2 dk', '2.5 dk', '3 dk'] as const;

export type DurationOption = (typeof DURATION_OPTIONS)[number];

/**
 * Kelime hedefi süreden türetilir (~170 kelime/dk seslendirme hızı). Tek kaynak:
 * prompt da, UI de bandı buradan okur — aynı sayı iki yerde tutulmaz.
 */
export const WORD_TARGETS: Record<DurationOption, { min: number; max: number }> = {
  '30 sn':  { min:  70, max: 100 },
  '45 sn':  { min: 110, max: 150 },
  '60 sn':  { min: 150, max: 190 },
  '90 sn':  { min: 230, max: 280 },
  '2 dk':   { min: 310, max: 370 },
  '2.5 dk': { min: 390, max: 460 },
  '3 dk':   { min: 470, max: 550 },
};

/** "2,5 DK." / "90 saniye" gibi serbest girişleri preset anahtarına indirger. */
function normalizeDuration(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/,/g, '.')
    .replace(/\.(?!\d)/g, '')                      // "dk." → "dk" ama "2.5" korunur
    .replace(/\b(saniye|saniyelik|sec)\b/g, 'sn')
    .replace(/\b(dakika|dakikalık|dakikalik|dak|min)\b/g, 'dk')
    .replace(/\s+/g, ' ')
    .trim();
}

const NORMALIZED_TARGETS = new Map(
  (Object.keys(WORD_TARGETS) as DurationOption[]).map((d) => [normalizeDuration(d), WORD_TARGETS[d]])
);

/**
 * Süre serbest metin de girilebildiği için hedef her zaman türetilemez. Tanınmayan
 * sürede null döner ve prompt kelime hedefi satırını hiç yazmaz — uydurulmuş bir
 * bant vermektense hedefi hiç vermemek doğrudur.
 */
export function wordTargetFor(
  duration: string | null | undefined
): { min: number; max: number } | null {
  if (!duration?.trim()) return null;
  return NORMALIZED_TARGETS.get(normalizeDuration(duration)) ?? null;
}

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
  /** Modelin bu üretim için beyan ettiği çeşitlilik etiketleri. */
  hook_family: string | null;
  payoff_type: string | null;
  cta_type: string | null;
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
  /** Onaylanan finalin etiketleri — çeşitlilik listesi buradan kurulur. */
  hook_family: string | null;
  payoff_type: string | null;
  cta_type: string | null;
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

/**
 * Öğrenme sinyali: bir final onaylandığında AI'ın ham çıktısı, kullanıcının
 * onayladığı hâli ve (varsa) gerekçesi birlikte saklanır. Karşılaştırmanın
 * anlamlı olması için o üretimi doğuran sürümler de satırda tutulur.
 */
export interface EditSignalDTO {
  id: string;
  script_id: string | null;
  script_title: string | null;
  format_id: string | null;
  format_label: string | null;
  /** Üretim olmadan doğrudan yazılıp onaylanan metinlerde null. */
  ai_text: string | null;
  final_text: string | null;
  edit_reason: string | null;
  dna_version: number | null;
  format_version: number | null;
  prompt_version: string | null;
  created_at: string;
}

// ── Çeşitlilik etiketleri ───────────────────────────────────────────────────
// DNA "son 3 içerikte kullanılan aile tekrarlanmaz" diyor. Bunun uygulanabilmesi
// için hangi ailenin kullanıldığının KAYITLI olması gerekir. Sözlükler DNA'daki
// tanımların aynısıdır; serbest metin etiket karşılaştırmayı imkânsız kılardı.

export const HOOK_FAMILIES = ['aforizma', 'çıplak sayı', 'sahne', 'soru'] as const;
export const PAYOFF_TYPES = ['dönüş', 'isimlendirme', 'ters çevirme'] as const;
/** CTA her metinde olmaz — DNA gerçek bir tartışma yoksa kullanılmamasını söyler. */
export const CTA_TYPES = ['eksik madde daveti', 'adalet sorusu', 'tahmin sorusu', 'yok'] as const;

export type HookFamily = (typeof HOOK_FAMILIES)[number];
export type PayoffType = (typeof PAYOFF_TYPES)[number];
export type CtaType = (typeof CTA_TYPES)[number];

export interface VarietyTags {
  hookFamily: string | null;
  payoffType: string | null;
  ctaType: string | null;
}

/** Aksan/büyük harf farklarını eler: "Çıplak Sayı" ile "ciplak sayi" eşleşsin. */
function foldTag(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // NFD sonrasi aksan isaretleri
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ');
}

/**
 * Modelin döndürdüğü etiketi sözlüğe oturtur. Sözlükte olmayan bir değer null
 * olur — uydurma etiket kaydetmek, çeşitlilik listesini sessizce bozardı.
 */
export function coerceTag<T extends string>(allowed: readonly T[], raw: unknown): T | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const needle = foldTag(raw);
  return allowed.find((a) => foldTag(a) === needle) ?? null;
}

/** Bir üretim/final satırından çeşitlilik etiketlerini güvenle çıkarır. */
export function readVarietyTags(row: {
  hook_family?: unknown;
  payoff_type?: unknown;
  cta_type?: unknown;
}): VarietyTags {
  return {
    hookFamily: coerceTag(HOOK_FAMILIES, row.hook_family),
    payoffType: coerceTag(PAYOFF_TYPES, row.payoff_type),
    ctaType: coerceTag(CTA_TYPES, row.cta_type),
  };
}
