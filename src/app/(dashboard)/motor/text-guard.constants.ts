/**
 * Üretilen metnin deterministik denetimi.
 *
 * MUTLAK KURALLAR 7 ve 8 modelden SAYMA istiyor ("toplamda en fazla 2") ve dil
 * modelleri bu işte güvenilir değil. Bu katman aynı sayımı kod tarafında yapar:
 * model uymasa bile kullanıcı görür.
 *
 * Saf fonksiyon — I/O yok, React yok. UI yalnızca sonucu gösterir; hiçbir şeyi
 * engellemez, onaylamayı bloklamaz. Amaç bilgilendirmek, karar vermek değil.
 */

import { durationSecondsFor, foldTurkish } from './engine.constants';

/** Kalıp tanımı: `source` aksansız-küçük harfli metne uygulanır. */
interface Pattern {
  /** Kullanıcıya gösterilen ad — orijinal yazımıyla. */
  label: string;
  source: string;
  /** true ise yalnızca cümle başında sayılır (ör. bağlaç "E"). */
  sentenceStart?: boolean;
}

/**
 * MUTLAK KURAL 8'in üç kategorisi. Sayım TOPLAMDA yapılır: kategoriler ayrı
 * kotalara sahip değildir.
 *
 * Konuşma bağlaçları ve izleyiciye dönüş ifadeleri kuralda tek tek sayılmıştı.
 * Kendi kendine itiraz kalıpları sayılmamıştı; buradaki liste DNA'nın kendi
 * örneğinden ("tamam, anladık — ama şu ne?") türetildi ve genişletilebilir.
 */
export const CONNECTOR_PATTERNS: Pattern[] = [
  // Konuşma bağlaçları
  { label: '"E" (cümle başı bağlaç)', source: 'e\\s', sentenceStart: true },
  { label: '"e işte"', source: '\\be iste\\b' },
  { label: '"ya tamam"', source: '\\bya tamam\\b' },
  { label: '"hatta"', source: '\\bhatta\\b' },
  // İzleyiciye dönüş
  { label: '"bakın"', source: '\\bbakin\\b' },
  { label: '"dikkat edin"', source: '\\bdikkat edin\\b' },
  // Kendi kendine itiraz
  { label: '"tamam, anladık"', source: '\\btamam,?\\s+anladik\\b' },
  { label: '"diyeceksiniz"', source: '\\bdiyeceksiniz\\b' },
  { label: '"diye soracaksınız"', source: '\\bdiye soracaksiniz\\b' },
];

/**
 * MUTLAK KURAL 7'nin yasak kapanışları. Kural "ve benzerleri" diyor; bunu
 * deterministik olarak saymak mümkün değil, o yüzden yalnızca sayılan dört
 * kalıp ve onların çekimleri aranır. Uyarı çıkmaması "temiz" demek değildir.
 */
export const CLICHE_PAYOFF_PATTERNS: Pattern[] = [
  { label: '"yeni bir hikâye başladı"', source: 'yeni bir hikaye basl' },
  { label: '"yeniden yazılmaya başladı"', source: 'yeniden yazilmaya basl' },
  { label: '"zaman gösterecek"', source: 'zaman goster' },
  { label: '"devamı gelecek"', source: 'devami gelecek' },
];

/** Süre eşikleri (saniye) — MUTLAK KURAL 8. */
export const CONNECTOR_LIMITS = [
  { maxSeconds: 59, limit: 1 },
  { maxSeconds: 120, limit: 2 },
] as const;
export const CONNECTOR_LIMIT_LONG = 3;

/**
 * Seçilen süreye düşen tavan. Süre tanınmıyorsa null döner ve uyarı üretilmez —
 * uydurulmuş bir eşiğe göre "kural ihlali" demek yanlış bilgi olurdu.
 */
export function connectorLimitFor(duration: string | null | undefined): number | null {
  const seconds = durationSecondsFor(duration);
  if (seconds === null) return null;
  for (const tier of CONNECTOR_LIMITS) {
    if (seconds <= tier.maxSeconds) return tier.limit;
  }
  return CONNECTOR_LIMIT_LONG;
}

/** Metni cümlelere böler; orijinal yazım korunur (uyarıda gösterilecek). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countIn(folded: string, p: Pattern): number {
  if (p.sentenceStart) return new RegExp(`^${p.source}`).test(folded) ? 1 : 0;
  return (folded.match(new RegExp(p.source, 'g')) ?? []).length;
}

export interface GuardHit {
  label: string;
  /** Kalıbın geçtiği cümle, orijinal hâliyle. */
  sentence: string;
}

export interface ConnectorReport {
  count: number;
  /** Süre tanınmıyorsa null. */
  limit: number | null;
  over: boolean;
  hits: GuardHit[];
}

export interface ClichePayoffReport {
  hits: GuardHit[];
  /** Denetlenen son cümle — uyarıda gösterilir. */
  lastSentence: string | null;
}

export interface TextGuardReport {
  connectors: ConnectorReport;
  clichePayoff: ClichePayoffReport;
  hasWarning: boolean;
}

/**
 * Metni denetler. Bağlaç sayımı metnin TAMAMINDA, klişe kapanış yalnızca SON
 * cümlede aranır (kural payoff'a özgüdür).
 */
export function checkGeneratedText(
  text: string,
  targetDuration: string | null | undefined
): TextGuardReport {
  const sentences = splitSentences(text ?? '');
  const limit = connectorLimitFor(targetDuration);

  const hits: GuardHit[] = [];
  let count = 0;
  for (const sentence of sentences) {
    const folded = foldTurkish(sentence);
    for (const p of CONNECTOR_PATTERNS) {
      const n = countIn(folded, p);
      if (n === 0) continue;
      count += n;
      hits.push({ label: p.label, sentence });
    }
  }

  const lastSentence = sentences.length ? sentences[sentences.length - 1] : null;
  const clicheHits: GuardHit[] = [];
  if (lastSentence) {
    const folded = foldTurkish(lastSentence);
    for (const p of CLICHE_PAYOFF_PATTERNS) {
      if (countIn(folded, p) > 0) clicheHits.push({ label: p.label, sentence: lastSentence });
    }
  }

  const over = limit !== null && count > limit;
  return {
    connectors: { count, limit, over, hits },
    clichePayoff: { hits: clicheHits, lastSentence },
    hasWarning: over || clicheHits.length > 0,
  };
}
