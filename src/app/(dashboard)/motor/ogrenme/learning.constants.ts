/**
 * Öğrenme sayfasının saf katmanı — sinyal listesinden türetilen sayımlar.
 * I/O yok, React yok: hem sunucu bileşeni hem kontrol scripti aynı fonksiyonu
 * kullanır, sayım iki yerde ayrı hesaplanmaz.
 */

import type { EditSignalDTO } from '../engine.constants';

export const NO_FORMAT_LABEL = 'Format atanmamış';

export interface FormatSignalCount {
  formatId: string | null;
  label: string;
  count: number;
  /** Gerekçe yazılmış sinyal sayısı — sayımın ne kadarının açıklaması var. */
  withReason: number;
}

/**
 * Format başına biriken sinyal sayısı, çoktan aza. Formatı olmayan sinyaller
 * gizlenmez; ayrı bir satırda toplanır — eksik veriyi yok saymak, sayımı yanlış
 * gösterir.
 */
export function countByFormat(signals: EditSignalDTO[]): FormatSignalCount[] {
  const acc = new Map<string, FormatSignalCount>();
  for (const s of signals) {
    const key = s.format_id ?? '';
    const row = acc.get(key) ?? {
      formatId: s.format_id,
      label: s.format_label ?? NO_FORMAT_LABEL,
      count: 0,
      withReason: 0,
    };
    row.count += 1;
    if (s.edit_reason?.trim()) row.withReason += 1;
    acc.set(key, row);
  }
  return [...acc.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));
}

/** Boşluğa göre kelime sayısı — metin yoksa null (0 demek yanlış olurdu). */
export function wordCount(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  return text.trim().split(/\s+/).length;
}

export interface SignalDelta {
  ai: number | null;
  final: number | null;
  /** final − ai. Üretim yoksa karşılaştırma yapılamaz: null. */
  diff: number | null;
}

/** Bir sinyalin kelime bazında ne kadar değiştiği. */
export function signalDelta(signal: EditSignalDTO): SignalDelta {
  const ai = wordCount(signal.ai_text);
  const final = wordCount(signal.final_text);
  return { ai, final, diff: ai === null || final === null ? null : final - ai };
}

/** "+12" / "−7" / "0" — işaretli, okunur fark. Karşılaştırılamazsa null. */
export function formatDelta(diff: number | null): string | null {
  if (diff === null) return null;
  if (diff === 0) return '0';
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}
