/**
 * Aylık özet — "ne yaptım, nasıl gitti, nerede yükseliyorum" sorularının
 * DÜZ TÜRKÇE cevabı.
 *
 * Neden var: panel bugüne kadar sayı gösteriyordu, sonuç göstermiyordu.
 * Kullanıcı 20 rakama bakıp yorumu kendi çıkarmak zorunda kalıyordu.
 *
 * Deterministik ve saf: aynı girdi → aynı cümleler. AI yok, tahmin yok;
 * her cümlenin arkasında hesaplanmış bir sayı var.
 */

import {
  MAIN_METRIC,
  MONTHLY_PLATFORM_LABELS,
  monthLabel,
  type MonthCompleteness,
  type MonthlyPlatform,
} from './social-monthly.constants';

// ── Eşikler (tek yerde, açıklanabilir) ──────────────────────────────────────

/** Bu yüzdenin üstü "yükseliş", altının eksisi "düşüş"; arası yatay. */
const MOVEMENT_THRESHOLD_PCT = 5;
/** Bir türün "belirgin üstün" sayılması için gereken kat. */
const GENRE_EDGE_RATIO = 1.5;

export type Movement = 'RISING' | 'FLAT' | 'FALLING' | 'NO_DATA';

export const MOVEMENT_META: Record<Movement, { text: string; color: string }> = {
  RISING:  { text: 'yükseliyor', color: 'var(--color-success)' },
  FLAT:    { text: 'yatay',      color: 'var(--color-text-secondary)' },
  FALLING: { text: 'düşüyor',    color: 'var(--color-error)' },
  NO_DATA: { text: 'veri yok',   color: 'var(--color-text-muted)' },
};

export interface MetricChange {
  current: number | null;
  previous: number | null;
  /** Fark. Taraflardan biri yoksa null. */
  delta: number | null;
  /** Yüzde değişim. Önceki 0/yoksa null — sıfıra bölmüyoruz. */
  percent: number | null;
  movement: Movement;
}

export interface PlatformSummary {
  platform: MonthlyPlatform;
  label: string;
  /** Erişim ölçüsünün adı — platformdan platforma değişir. */
  reachLabel: string;
  reach: MetricChange;
  followers: MetricChange;
  /** Bu platform hakkında tek cümle. */
  sentence: string;
}

export interface GenreStat {
  label: string;
  count: number;
  avgViews: number;
}

export interface MonthlySummary {
  month: string;
  monthLabel: string;
  /** Ne yaptım. */
  did: string[];
  /** Nasıl gitti — toplam resim. */
  went: string[];
  /** Nerede yükseliyorum. */
  rising: string[];
  /** Veri eksikliği/bozukluğu — sayılar yanıltmasın diye. */
  warnings: string[];
  /** Tek tek platform görünümü. */
  platforms: PlatformSummary[];
}

export interface SummaryInput {
  month: string;
  /** Bu ayın satırları (platform → kolonlar). */
  rows: { platform: string; [column: string]: unknown }[];
  /** Önceki ayın satırları. */
  previousRows: { platform: string; [column: string]: unknown }[];
  /** Bu ay yayınlanan içerik sayısı. */
  contentCount: number;
  /** Bir önceki ay yayınlanan içerik sayısı. */
  previousContentCount: number;
  /** YouTube tür ortalamaları (en iyi türü söyleyebilmek için). */
  genres: GenreStat[];
  /** Doluluk haritası — uyarılar buradan. */
  completeness: MonthCompleteness;
  /** Hangi platformlar özetlenecek. */
  tracked: MonthlyPlatform[];
}

// ── Yardımcılar ─────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  // 0 bu tabloda pratikte "girilmedi" demek (bkz. isFilled).
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M`;
  if (n >= 10_000) return `${Math.round(n / 1000).toLocaleString('tr-TR')}B`;
  return n.toLocaleString('tr-TR');
}

function change(current: number | null, previous: number | null): MetricChange {
  if (current == null && previous == null) {
    return { current, previous, delta: null, percent: null, movement: 'NO_DATA' };
  }
  if (current == null || previous == null) {
    return { current, previous, delta: null, percent: null, movement: 'NO_DATA' };
  }
  const delta = current - previous;
  const percent = previous === 0 ? null : Math.round((delta / previous) * 100);
  let movement: Movement = 'FLAT';
  if (percent != null) {
    if (percent >= MOVEMENT_THRESHOLD_PCT) movement = 'RISING';
    else if (percent <= -MOVEMENT_THRESHOLD_PCT) movement = 'FALLING';
  }
  return { current, previous, delta, percent, movement };
}

function signed(n: number): string {
  return `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

// ── Özet ────────────────────────────────────────────────────────────────────

export function buildMonthlySummary(input: SummaryInput): MonthlySummary {
  const { month, rows, previousRows, contentCount, previousContentCount, genres, completeness, tracked } = input;

  const byPlatform = new Map(rows.map((r) => [r.platform, r]));
  const prevByPlatform = new Map(previousRows.map((r) => [r.platform, r]));

  // ── Platform tek tek ──────────────────────────────────────────────────────
  const platforms: PlatformSummary[] = tracked.map((platform) => {
    const row = byPlatform.get(platform);
    const prev = prevByPlatform.get(platform);
    const metric = MAIN_METRIC[platform];

    const reach = change(num(row?.[metric.key]), num(prev?.[metric.key]));
    const followers = change(num(row?.followers_total), num(prev?.followers_total));

    return {
      platform,
      label: MONTHLY_PLATFORM_LABELS[platform],
      reachLabel: metric.label,
      reach,
      followers,
      sentence: platformSentence(MONTHLY_PLATFORM_LABELS[platform], metric.label, reach, followers),
    };
  });

  // ── Ne yaptım ─────────────────────────────────────────────────────────────
  const did: string[] = [];
  if (contentCount === 0) {
    did.push(`${monthLabel(month)} ayında yayınlanmış içerik kaydı yok.`);
  } else {
    const diff = contentCount - previousContentCount;
    const trend =
      previousContentCount === 0 ? '' :
      diff > 0 ? ` (önceki aydan ${diff} fazla)` :
      diff < 0 ? ` (önceki aydan ${Math.abs(diff)} az)` : ' (önceki ayla aynı)';
    did.push(`${monthLabel(month)} ayında ${contentCount} içerik yayınladın${trend}.`);
  }

  const withData = platforms.filter((p) => p.reach.current != null || p.followers.current != null);
  if (withData.length > 0) {
    did.push(`${withData.length} platformun verisi girilmiş: ${withData.map((p) => p.label).join(', ')}.`);
  }

  // ── Nasıl gitti ───────────────────────────────────────────────────────────
  const went: string[] = [];
  const comparable = platforms.filter((p) => p.reach.movement !== 'NO_DATA');

  if (comparable.length === 0) {
    went.push('Geçen ayla karşılaştırılabilecek veri yok — bu ay ilk dolu ay ya da önceki ay eksik.');
  } else {
    const totalNow = comparable.reduce((s, p) => s + (p.reach.current ?? 0), 0);
    const totalPrev = comparable.reduce((s, p) => s + (p.reach.previous ?? 0), 0);
    const totalPct = totalPrev === 0 ? null : Math.round(((totalNow - totalPrev) / totalPrev) * 100);
    went.push(
      totalPct == null
        ? `Toplam erişim ${fmt(totalNow)}.`
        : `Toplam erişim ${fmt(totalNow)} — geçen aya göre %${Math.abs(totalPct)} ${totalPct >= 0 ? 'artış' : 'düşüş'} (${fmt(totalPrev)} idi).`
    );

    const followerGain = platforms
      .filter((p) => p.followers.delta != null)
      .reduce((s, p) => s + (p.followers.delta ?? 0), 0);
    if (followerGain !== 0) {
      went.push(`Takipçi toplamı ${signed(followerGain)}.`);
    }
  }

  // ── Nerede yükseliyorum ───────────────────────────────────────────────────
  const rising: string[] = [];
  const risers = comparable
    .filter((p) => p.reach.movement === 'RISING')
    .sort((a, b) => (b.reach.percent ?? 0) - (a.reach.percent ?? 0));
  const fallers = comparable
    .filter((p) => p.reach.movement === 'FALLING')
    .sort((a, b) => (a.reach.percent ?? 0) - (b.reach.percent ?? 0));

  if (risers.length > 0) {
    rising.push(`Yükselen: ${risers.map((p) => `${p.label} (%${p.reach.percent})`).join(', ')}.`);
  }
  if (fallers.length > 0) {
    rising.push(`Düşen: ${fallers.map((p) => `${p.label} (%${Math.abs(p.reach.percent ?? 0)})`).join(', ')}.`);
  }
  if (risers.length === 0 && fallers.length === 0 && comparable.length > 0) {
    rising.push('Platformların hepsi geçen ayla benzer seviyede — belirgin bir yükseliş ya da düşüş yok.');
  }

  // İçerik türü: en iyi tür ile en çok üretilen tür farklıysa bu bir fırsattır.
  const scored = genres.filter((g) => g.count > 0 && g.avgViews > 0);
  if (scored.length >= 2) {
    const best = [...scored].sort((a, b) => b.avgViews - a.avgViews)[0];
    const mostProduced = [...scored].sort((a, b) => b.count - a.count)[0];
    if (best.label === mostProduced.label) {
      rising.push(`En çok tutan tür "${best.label}" (ort. ${fmt(best.avgViews)} izlenme) ve en çok ürettiğin tür de bu — isabetli.`);
    } else if (best.avgViews >= mostProduced.avgViews * GENRE_EDGE_RATIO) {
      const ratio = (best.avgViews / mostProduced.avgViews).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
      rising.push(
        `"${best.label}" türü ort. ${fmt(best.avgViews)} izlenme alıyor — en çok ürettiğin "${mostProduced.label}" türünün ${ratio} katı. ` +
        `${best.count} adet "${best.label}" üretmişsin, ${mostProduced.count} adet "${mostProduced.label}". En çok tutanı en az üretiyorsun.`
      );
    }
  }

  // ── Uyarılar ──────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  for (const p of completeness.platforms) {
    if (p.missing) {
      warnings.push(`${p.label}: bu ay için hiç kayıt girilmemiş.`);
      continue;
    }
    if (p.brokenApiFields.length > 0) {
      warnings.push(`${p.label}: ${p.brokenApiFields.join(', ')} otomatik gelmesi gerekirken boş — entegrasyon sorunu.`);
    }
    if (p.pendingManualFields.length > 0) {
      warnings.push(`${p.label}: ${p.pendingManualFields.join(', ')} elle girilmemiş.`);
    }
  }

  return {
    month,
    monthLabel: monthLabel(month),
    did,
    went,
    rising,
    warnings,
    platforms,
  };
}

/** Bir platform hakkında tek cümlelik karne. */
function platformSentence(
  label: string,
  reachLabel: string,
  reach: MetricChange,
  followers: MetricChange
): string {
  if (reach.current == null && followers.current == null) {
    return `${label}: bu ay veri girilmemiş.`;
  }

  const parts: string[] = [];
  if (reach.current != null) {
    parts.push(
      reach.percent == null
        ? `${reachLabel.toLocaleLowerCase('tr')} ${fmt(reach.current)}`
        : `${reachLabel.toLocaleLowerCase('tr')} ${fmt(reach.current)} (%${Math.abs(reach.percent)} ${reach.percent >= 0 ? 'artış' : 'düşüş'})`
    );
  }
  if (followers.delta != null && followers.delta !== 0) {
    parts.push(`takipçi ${signed(followers.delta)}`);
  } else if (followers.current != null) {
    parts.push(`takipçi ${fmt(followers.current)}`);
  }

  return `${label}: ${parts.join(', ')}.`;
}
