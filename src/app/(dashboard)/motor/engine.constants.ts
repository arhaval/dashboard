/** İçerik Motoru — client-safe types, section keys & labels (no server imports). */

export type ScriptStatus = 'DRAFT' | 'AI_EDITED' | 'FINAL';
export type EnginePlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'X';
export type ReferenceSourceType = 'SRT' | 'TEXT' | 'VIDEO';

/** The prompt template revision — bump when the generation prompt changes so we
 *  can later tell which prompt shape produced which output. */
export const PROMPT_VERSION = 'v1';

/** Arhaval DNA sections (Layer 1) — the same keys stored in ai_dna.sections. */
export const DNA_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'voice',      label: 'Anlatıcı Sesi / Ton',   hint: 'Nasıl konuşuyoruz? "Biz" dili, samimiyet, iddia, jargon.' },
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
  { value: 'YOUTUBE',   label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK',    label: 'TikTok' },
  { value: 'X',         label: 'X' },
];

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
  created_at: string;
}
