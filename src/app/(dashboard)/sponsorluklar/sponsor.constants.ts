/** Sponsor module — client-safe types & labels (no server imports). */

export type SponsorStatus = 'ACTIVE' | 'NEGOTIATING' | 'ENDED';
export type SponsorFileCategory = 'contract' | 'logo_pack' | 'other';

export interface Sponsor {
  id: string;
  name: string;
  logo_path: string | null;
  status: SponsorStatus;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  notes: string | null;
  contact: string | null;
  deal_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorFile {
  id: string;
  sponsor_id: string;
  category: SponsorFileCategory;
  file_name: string;
  file_path: string;
  size_bytes: number | null;
  created_at: string;
}

export const STATUS_META: Record<SponsorStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:      { label: 'Aktif',       bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  NEGOTIATING: { label: 'Görüşülüyor', bg: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
  ENDED:       { label: 'Bitti',       bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-muted)' },
};

export const CATEGORY_LABELS: Record<SponsorFileCategory, string> = {
  contract: 'Sözleşme',
  logo_pack: 'Logo Paketi',
  other: 'Diğer',
};
