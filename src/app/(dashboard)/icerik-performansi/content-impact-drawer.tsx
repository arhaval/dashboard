'use client';

/**
 * İçerik detayı.
 *
 * TASARIM KARARI — neden sekmeli:
 * Önceki hali tek bir uzun kaydırmaydı; 16 metrik kutusu, ardından her platform
 * için 14 metriklik şişman kartlar, ardından öneriler. Üç platformlu bir
 * içerikte ekran bitmiyordu ve her şey aynı puntoda olduğu için hiçbir şey öne
 * çıkmıyordu. Artık üç bölüm var ve aynı anda yalnızca biri görünüyor:
 *
 *   ÖZET       → karar için gereken iki sayı ve genel durum
 *   PLATFORMLAR→ platform platform kırılım (akordiyon)
 *   SONUÇ      → editoryal yorum ve aksiyonlar
 *
 * Biçim dili ürünün mevcut İsviçre tipografisi; yalnızca gerçekten uygulanıyor:
 * kutu içinde kutu yerine ince çizgiler, tek tip 10px yerine gerçek bir ölçek,
 * sayılar hizalı monospace. Telefonda tam ekran, masaüstünde sağ panel.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PlatformsPane } from './content-impact-platforms';
import {
  CORE_TOTALS,
  METRIC_CATALOG,
  METRIC_LABELS,
  OVERALL_STATUS_META,
  TOTALS_ORDER,
  fmtDate,
  fmtInt,
  fmtMetricValue,
  fmtRatio,
  type ContentImpact,
  type MetricTotal,
  type RecommendationPriority,
  type SummableMetricKey,
} from './content-impact.constants';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../icerik-plani/content-queue.constants';

type Pane = 'summary' | 'platforms' | 'verdict';

const PRIORITY: Record<RecommendationPriority, { text: string; color: string }> = {
  HIGH: { text: 'Yüksek', color: 'var(--color-error)' },
  MEDIUM: { text: 'Orta', color: 'var(--color-warning)' },
  LOW: { text: 'Düşük', color: 'var(--color-text-muted)' },
};

export function ContentImpactDrawer({ impact, onClose }: { impact: ContentImpact; onClose: () => void }) {
  const [pane, setPane] = useState<Pane>('summary');
  const status = OVERALL_STATUS_META[impact.verdict.status];

  // Esc ile kapanma + arkadaki sayfanın kaymaması.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const panes: { id: Pane; label: string; count?: number }[] = [
    { id: 'summary', label: 'Özet' },
    { id: 'platforms', label: 'Platformlar', count: impact.publications.length },
    { id: 'verdict', label: 'Sonuç', count: impact.recommendation.actions.length },
  ];

  return (
    <div className="ci-shell">
      {/*
        Panelin ölçüleri ve girişi burada tanımlı, Tailwind sınıflarıyla değil:
        düzenin çalışması, bir yardımcı sınıfın üretilip üretilmediğine bağlı
        olmamalı. Telefonda alttan gelen tam ekran, masaüstünde sağ panel.
      */}
      <style>{`
        .ci-shell { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end }
        .ci-panel { position: relative; z-index: 10; display: flex; flex-direction: column;
                    height: 100%; width: 100%;
                    animation: ci-panel-up 260ms cubic-bezier(.22,1,.36,1) }
        @media (min-width: 640px) {
          .ci-panel { max-width: 560px; border-left: 1px solid var(--color-border);
                      animation: ci-panel-right 220ms cubic-bezier(.22,1,.36,1) }
        }
        @media (min-width: 1024px) { .ci-panel { max-width: 640px } }
        @keyframes ci-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes ci-panel-up { from { transform: translateY(100%) } to { transform: none } }
        @keyframes ci-panel-right { from { transform: translateX(24px); opacity: .6 } to { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .ci-panel, .ci-shell [style*="ci-fade"] { animation: none !important }
        }
      `}</style>

      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <aside className="ci-panel" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {/* ── Künye ─────────────────────────────────────────────────────────── */}
        <header
          className="flex items-start gap-3 px-5 pb-4 pt-5"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {impact.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={impact.thumbnail}
              alt=""
              className="h-11 w-[74px] flex-shrink-0 object-cover"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h2
              className="text-[15px] font-semibold leading-tight"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
            >
              {impact.title}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <code className="font-mono">#{impact.code}</code>
              <span>·</span>
              <span>{fmtDate(impact.firstPublishedAt)}</span>
              {impact.contentType && <><span>·</span><span>{impact.contentType}</span></>}
              {impact.inLibrary && <><span>·</span><span style={{ color: 'var(--color-info)' }}>metin var</span></>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 flex-shrink-0 p-1.5"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Kapat"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* ── Bölüm seçimi ──────────────────────────────────────────────────── */}
        <nav className="flex gap-6 px-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {panes.map((p) => {
            const active = pane === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPane(p.id)}
                className="relative -mb-px py-3 text-[11px] font-semibold uppercase transition-colors"
                style={{
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  letterSpacing: '0.08em',
                  borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                }}
              >
                {p.label}
                {p.count != null && (
                  <span className="ml-1.5 font-mono" style={{ opacity: 0.55 }}>{p.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── İçerik ────────────────────────────────────────────────────────── */}
        <div key={pane} className="flex-1 overflow-y-auto px-5 py-5" style={{ animation: 'ci-fade 240ms ease-out' }}>
          {pane === 'summary' && <SummaryPane impact={impact} status={status} />}
          {pane === 'platforms' && <PlatformsPane publications={impact.publications} />}
          {pane === 'verdict' && <VerdictPane impact={impact} />}
        </div>
      </aside>
    </div>
  );
}

// ── ÖZET ─────────────────────────────────────────────────────────────────────

function SummaryPane({ impact, status }: {
  impact: ContentImpact;
  status: { text: string; bg: string; color: string };
}) {
  const { totals, comparison, verdict } = impact;
  const secondary = TOTALS_ORDER.filter(
    (k) => k !== 'exposure' && (CORE_TOTALS.includes(k) || totals[k]?.value != null)
  );

  return (
    <div className="flex flex-col gap-7">
      {/* İki büyük sayı — karar bunlarla veriliyor, gerisi destek. */}
      <div className="flex flex-col gap-5">
        <Headline label="Toplam erişim" total={totals.exposure} hint={METRIC_CATALOG.exposure.note} />
        <Headline label="Toplam etkileşim" total={totals.engagements} hint="Beğeni + yorum + paylaşım + kaydetme. Ham toplamdır, başarı skoru değildir." />
      </div>

      {/* Genel durum */}
      <section>
        <MicroLabel>Genel durum</MicroLabel>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span
            className="text-[19px] font-semibold"
            style={{ color: status.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          >
            {status.text}
          </span>
          <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>{verdict.note}</span>
        </div>
      </section>

      {/* En güçlü / en zayıf */}
      {comparison.strongest && (
        <section>
          <MicroLabel>Platform kıyası</MicroLabel>
          <div className="mt-2">
            <RankRow kind="En güçlü" rank={comparison.strongest} />
            {comparison.weakest ? (
              <RankRow kind="En zayıf" rank={comparison.weakest} />
            ) : (
              <p
                className="py-2 text-[11.5px]"
                style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}
              >
                Karşılaştırılabilir tek platform var — en zayıf belirlenemez.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Diğer toplamlar */}
      <section>
        <MicroLabel>Toplamlar</MicroLabel>
        <dl className="mt-2">
          {secondary.map((key) => (
            <TotalRow key={key} metricKey={key} total={totals[key]} />
          ))}
        </dl>
        <p className="mt-2.5 text-[10.5px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Toplamlara yalnızca veri sağlayan platformlar girer — eksik veri sıfır sayılmaz.
        </p>
      </section>
    </div>
  );
}

/** Büyük sayı + veri kapsamı. Ölçek farkı hiyerarşiyi tek başına kuruyor. */
function Headline({ label, total, hint }: { label: string; total: MetricTotal; hint?: string }) {
  const complete = total.available === total.total;
  return (
    <div title={hint}>
      <MicroLabel>{label}</MicroLabel>
      <p
        className="mt-1 font-mono leading-none"
        style={{
          color: total.value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          fontSize: 'clamp(30px, 8vw, 38px)',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {total.value == null ? '—' : fmtInt(total.value)}
      </p>
      <p className="mt-1.5 text-[11px]" style={{ color: complete ? 'var(--color-text-muted)' : 'var(--color-warning)' }}>
        {total.available}/{total.total} platformdan veri
      </p>
    </div>
  );
}

function RankRow({ kind, rank }: {
  kind: string;
  rank: { platform: keyof typeof PLATFORM_LABELS; score: number; explanation: string };
}) {
  const color = PLATFORM_COLORS[rank.platform];
  return (
    <div
      className="flex items-baseline gap-3 py-2"
      style={{ borderTop: '1px solid var(--color-border)' }}
      title={rank.explanation}
    >
      <span className="w-[58px] flex-shrink-0 text-[10.5px] uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
        {kind}
      </span>
      <span className="flex-1 text-[12.5px] font-semibold" style={{ color: color.color }}>
        {PLATFORM_LABELS[rank.platform]}
      </span>
      <span className="font-mono text-[13px]" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {fmtRatio(rank.score)}×
      </span>
    </div>
  );
}

/**
 * "Toplam erişim" → "Erişim". Başlık zaten "Toplamlar" olduğu için her satırda
 * tekrar etmesi gereksiz. Türkçe büyük harf: i → İ.
 */
function shortTotalLabel(key: SummableMetricKey): string {
  const stripped = METRIC_LABELS[key].replace(/^Toplam /, '');
  return stripped.charAt(0).toLocaleUpperCase('tr') + stripped.slice(1);
}

function TotalRow({ metricKey, total }: { metricKey: SummableMetricKey; total: MetricTotal }) {
  const partial = total.value != null && total.available < total.total;
  return (
    <div className="flex items-baseline justify-between gap-3 py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
      <dt className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }} title={METRIC_CATALOG[metricKey].note}>
        {shortTotalLabel(metricKey)}
      </dt>
      <dd className="flex items-baseline gap-2">
        {partial && (
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-warning)' }} title="Bazı platformların verisi yok">
            {total.available}/{total.total}
          </span>
        )}
        <span
          className="font-mono text-[12.5px]"
          style={{
            color: total.value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtMetricValue(metricKey, total.value)}
        </span>
      </dd>
    </div>
  );
}

// ── SONUÇ ────────────────────────────────────────────────────────────────────

function VerdictPane({ impact }: { impact: ContentImpact }) {
  const { observation, interpretation, actions, triggeredRules } = impact.recommendation;

  return (
    <div className="flex flex-col gap-7">
      <Prose title="Ne oldu?" items={observation} />
      <Prose title="Ne anlama geliyor?" items={interpretation} />

      <section>
        <MicroLabel>Önerilen aksiyonlar</MicroLabel>
        {actions.length === 0 ? (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
            Aksiyon gerektiren bir bulgu yok.
          </p>
        ) : (
          <ol className="mt-2">
            {actions.map((a, i) => (
              <li
                key={a.code}
                className="flex gap-3 py-3"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span
                  className="mt-0.5 font-mono text-[11px]"
                  style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {a.label}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {a.reason}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span style={{ color: PRIORITY[a.priority].color }}>{PRIORITY[a.priority].text} öncelik</span>
                    <span>·</span>
                    <code className="font-mono">{a.code}</code>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {triggeredRules.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Tetiklenen kurallar ({triggeredRules.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {triggeredRules.map((r) => (
              <code
                key={r}
                className="px-1.5 py-0.5 font-mono text-[10px]"
                style={{
                  backgroundColor: 'var(--color-surface-sunken)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {r}
              </code>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Asılı madde işaretli editoryal paragraflar — kutu yok, çizgi yok. */
function Prose({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <MicroLabel>{title}</MicroLabel>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((t, i) => (
          <li
            key={i}
            className="text-[13px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', textIndent: '-0.85em', paddingLeft: '0.85em' }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>— </span>{t}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase"
      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.11em' }}
    >
      {children}
    </p>
  );
}
