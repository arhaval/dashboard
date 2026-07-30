'use client';

/**
 * İçerik detayı — ekranın ortasında açılan YATAY diyalog.
 *
 * TASARIM KARARI — neden sağ panel değil:
 * Sağa yapışık dar bir panel içeriği zorunlu olarak dikey uzatıyordu; 15 satırlık
 * toplamlar listesi tek sütunda akıyor, kullanıcı sürekli kaydırıyordu. Geniş ve
 * ortada bir diyalogda aynı bilgi yatayda yayılıyor:
 *
 *   ┌───────────────┬─────────────────────────────────┐
 *   │ Karar sayıları│ Toplamlar · Platformlar · Sonuç │
 *   │ (her zaman    │ (sekmeli detay, iki sütun)      │
 *   │  görünür)     │                                 │
 *   └───────────────┴─────────────────────────────────┘
 *
 * Sol sütun kararı veren üç şeyi hiç kaybettirmez (erişim, etkileşim, durum);
 * sağ taraf değişir. Telefonda ikisi alt alta, tam ekran.
 *
 * TİPOGRAFİ SİSTEMİ — her ailenin bir işi var:
 *   serif → miktarlar ve başlıklar (resmi, editoryal; rapor gibi okunur)
 *   sans  → dil (etiket, açıklama, yorum)
 *   mono  → tanımlayıcılar ve hizalanması gereken tablo değerleri
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PlatformsPane } from './content-impact-platforms';
import {
  METRIC_CATALOG,
  OVERALL_STATUS_META,
  fmtDate,
  fmtInt,
  fmtRatio,
  verdictHeadline,
  type ContentImpact,
  type MetricTotal,
  type RecommendationPriority,
} from './content-impact.constants';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../icerik-plani/content-queue.constants';

type Pane = 'totals' | 'platforms' | 'verdict';

const PRIORITY: Record<RecommendationPriority, { text: string; color: string }> = {
  HIGH: { text: 'Yüksek', color: 'var(--color-error)' },
  MEDIUM: { text: 'Orta', color: 'var(--color-warning)' },
  LOW: { text: 'Düşük', color: 'var(--color-text-muted)' },
};

export function ContentImpactDrawer({ impact, onClose }: { impact: ContentImpact; onClose: () => void }) {
  const [pane, setPane] = useState<Pane>('totals');
  const status = OVERALL_STATUS_META[impact.verdict.status];
  const headline = verdictHeadline(impact.publications, impact.verdict);

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
    { id: 'totals', label: 'Toplamlar' },
    { id: 'platforms', label: 'Platformlar', count: impact.publications.length },
    { id: 'verdict', label: 'Aksiyonlar', count: impact.recommendation.actions.length },
  ];

  return (
    <div className="ci-shell" onClick={onClose}>
      {/*
        Ölçüler ve giriş burada tanımlı, yardımcı sınıflarla değil: kritik bir
        düzen özelliğinin bir sınıfın üretilip üretilmediğine bağlı olmaması için.
      */}
      <style>{`
        .ci-shell { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
                    background: rgba(0,0,0,.72); padding: 0 }
        .ci-dialog { position: relative; display: flex; flex-direction: column;
                     width: 100%; height: 100%; overflow: hidden;
                     background: var(--color-bg-secondary);
                     animation: ci-in 240ms cubic-bezier(.22,1,.36,1) }
        .ci-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto }
        .ci-rail { padding: 20px; border-bottom: 1px solid var(--color-border) }
        .ci-main { display: flex; flex-direction: column; min-height: 0; flex: 1 }
        .ci-cols { display: grid; grid-template-columns: 1fr; gap: 0 40px }

        @media (min-width: 900px) {
          .ci-shell { padding: 28px }
          .ci-dialog { width: min(1120px, 100%); height: min(680px, 100%);
                       border: 1px solid var(--color-border); border-radius: var(--radius-lg) }
          .ci-body { flex-direction: row; overflow: hidden }
          .ci-rail { width: 296px; flex: 0 0 296px; overflow-y: auto; padding: 24px;
                     border-bottom: 0; border-right: 1px solid var(--color-border) }
          .ci-main { overflow: hidden }
          .ci-cols { grid-template-columns: 1fr 1fr }
        }
        @keyframes ci-in { from { opacity: 0; transform: translateY(10px) scale(.99) } to { opacity: 1; transform: none } }
        @keyframes ci-fade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) {
          .ci-dialog, .ci-shell [style*="ci-fade"] { animation: none !important }
        }
      `}</style>

      <div className="ci-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ── Künye ───────────────────────────────────────────────────────── */}
        <header
          className="flex items-start gap-3.5 px-5 py-4 sm:px-6"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {impact.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={impact.thumbnail}
              alt=""
              className="h-10 w-[68px] flex-shrink-0 object-cover"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-[17px]"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-source-serif)',
                fontWeight: 600,
                letterSpacing: '-0.005em',
              }}
            >
              {impact.title}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              <code className="font-mono">#{impact.code}</code>
              <span>·</span><span>{fmtDate(impact.firstPublishedAt)}</span>
              {impact.contentType && <><span>·</span><span>{impact.contentType}</span></>}
              {impact.inLibrary && <><span>·</span><span style={{ color: 'var(--color-info)' }}>metin var</span></>}
            </p>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 flex-shrink-0 p-1.5" style={{ color: 'var(--color-text-muted)' }} aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="ci-body">
          {/* ── Karar sütunu — her zaman görünür ─────────────────────────── */}
          <aside className="ci-rail flex flex-col gap-6">
            <Figure
              label="Toplam platform görünürlüğü"
              total={impact.totals.exposure}
              hint={METRIC_CATALOG.exposure.note}
            />
            <Figure
              label="Toplam içerik izlenmesi"
              total={impact.totals.views}
              hint={METRIC_CATALOG.views.note}
            />

            <div>
              <MicroLabel>Genel durum</MicroLabel>
              {/* Tek kelimelik "Orta" iki platformu da yanlış anlatabiliyordu;
                  fark belirginse ana mesaj farkı söyler, etiket alt satırda kalır. */}
              <p
                className="mt-1.5 text-[19px] leading-tight"
                style={{
                  color: headline.variesByPlatform ? 'var(--color-text-primary)' : status.color,
                  fontFamily: 'var(--font-source-serif)',
                  fontWeight: 600,
                }}
              >
                {headline.title}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {headline.detail}
              </p>
              <p className="mt-1 text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>
                {headline.variesByPlatform && (
                  <span style={{ color: status.color }}>Genel skor: {status.text} · </span>
                )}
                {impact.verdict.note}
              </p>
            </div>

            {impact.comparison.strongest && (
              <div>
                <MicroLabel>Platform kıyası</MicroLabel>
                <div className="mt-1.5">
                  <RankRow kind="En güçlü" rank={impact.comparison.strongest} />
                  {impact.comparison.weakest && <RankRow kind="En zayıf" rank={impact.comparison.weakest} />}
                </div>
              </div>
            )}
          </aside>

          {/* ── Sekmeli detay ────────────────────────────────────────────── */}
          <div className="ci-main">
            <nav className="flex gap-6 px-5 sm:px-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
              {panes.map((p) => {
                const active = pane === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPane(p.id)}
                    className="-mb-px py-3 text-[11px] font-semibold uppercase transition-colors"
                    style={{
                      color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      letterSpacing: '0.09em',
                      borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                    }}
                  >
                    {p.label}
                    {p.count != null && <span className="ml-1.5 font-mono" style={{ opacity: 0.5 }}>{p.count}</span>}
                  </button>
                );
              })}
            </nav>

            <div
              key={pane}
              className="flex-1 overflow-y-auto px-5 py-5 sm:px-6"
              style={{ animation: 'ci-fade 220ms ease-out', minHeight: 0 }}
            >
              {pane === 'totals' && <TotalsPane impact={impact} />}
              {pane === 'platforms' && <PlatformsPane publications={impact.publications} />}
              {pane === 'verdict' && <VerdictPane impact={impact} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Karar sütunu parçaları ───────────────────────────────────────────────────

/** Büyük miktar. Ölçek farkı hiyerarşiyi tek başına kuruyor. */
function Figure({ label, total, hint }: { label: string; total: MetricTotal; hint?: string }) {
  const complete = total.available === total.total;
  return (
    <div title={hint}>
      <MicroLabel>{label}</MicroLabel>
      <p
        className="mt-1 leading-none"
        style={{
          color: total.value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          fontFamily: 'var(--font-source-serif)',
          fontSize: 'clamp(30px, 4.4vw, 40px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums lining-nums',
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
    <div className="flex items-baseline gap-2 py-1.5" style={{ borderTop: '1px solid var(--color-border)' }} title={rank.explanation}>
      <span className="w-[56px] flex-shrink-0 text-[10px] uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.07em' }}>
        {kind}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold" style={{ color: color.color }}>
        {PLATFORM_LABELS[rank.platform]}
      </span>
      <span
        className="text-[14px]"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-source-serif)', fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtRatio(rank.score)}×
      </span>
    </div>
  );
}

// ── TOPLAMLAR ────────────────────────────────────────────────────────────────

/**
 * Yalnızca KARAR metrikleri.
 *
 * Eskiden 15 satırlık bir liste vardı; oynatma listesi çıkarma sayısı ile
 * toplam etkileşim aynı ağırlıkta duruyordu. Platforma özel ayrıntılar
 * (engaged views, oynatma listesi, ortalama süre, tamamlanma, Meta toplamı)
 * Platformlar sekmesine taşındı — orada zaten bağlamıyla birlikte duruyorlar.
 */
function TotalsPane({ impact }: { impact: ContentImpact }) {
  const { totals } = impact;

  // Paylaşım ve kaydetme ayrı ayrı değil, birlikte anlamlı: ikisi de
  // "başkasına göstermek / sonra dönmek" niyetini ölçer.
  const intentValue =
    totals.shares.value == null && totals.saves.value == null
      ? null
      : (totals.shares.value ?? 0) + (totals.saves.value ?? 0);
  const intentAvailable = Math.max(totals.shares.available, totals.saves.available);

  const components = [
    totals.likes.value != null ? `${fmtInt(totals.likes.value)} beğeni` : null,
    totals.comments.value != null ? `${fmtInt(totals.comments.value)} yorum` : null,
    totals.shares.value != null ? `${fmtInt(totals.shares.value)} paylaşım` : null,
    totals.saves.value != null ? `${fmtInt(totals.saves.value)} kaydetme` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div>
      <dl>
        <SummaryRow
          label="Ölçülebilen etkileşim"
          value={totals.engagements.value}
          available={totals.engagements.available}
          total={totals.engagements.total}
          sub={components || undefined}
          hint="Beğeni + yorum + paylaşım + kaydetme. Ham toplamdır, başarı skoru değildir."
        />
        <SummaryRow
          label="Paylaşım + kaydetme"
          value={intentValue}
          available={intentAvailable}
          total={totals.shares.total}
          sub="Güçlü niyet aksiyonları — içeriği başkasına gösterme veya sonra dönme."
        />
        <SummaryRow
          label="Takipçi/abone kazanımı"
          value={totals.followersGained.value}
          available={totals.followersGained.available}
          total={totals.followersGained.total}
          hint="YouTube'da abone, Instagram'da takipçi — ortak kavram."
        />
      </dl>
      <p className="mt-4 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Toplamlara yalnızca veri sağlayan platformlar girer — eksik veri sıfır sayılmaz.
        Platforma özel ayrıntılar (engaged views, oynatma listesi, ortalama süre, tamamlanma)
        Platformlar sekmesinde.
      </p>
    </div>
  );
}

function SummaryRow({ label, value, available, total, sub, hint }: {
  label: string; value: number | null; available: number; total: number; sub?: string; hint?: string;
}) {
  const partial = value != null && available < total;
  return (
    <div className="py-3" style={{ borderTop: '1px solid var(--color-border)' }} title={hint}>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</dt>
        <dd className="flex items-baseline gap-2">
          {partial && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-warning)' }} title="Bazı platformların verisi yok">
              {available}/{total}
            </span>
          )}
          <span
            className="text-[19px]"
            style={{
              color: value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
              fontFamily: 'var(--font-source-serif)',
              fontVariantNumeric: 'tabular-nums lining-nums',
            }}
          >
            {value == null ? '—' : fmtInt(value)}
          </span>
        </dd>
      </div>
      {sub && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
      )}
    </div>
  );
}

// ── SONUÇ ────────────────────────────────────────────────────────────────────

function VerdictPane({ impact }: { impact: ContentImpact }) {
  const { observation, interpretation, actions, triggeredRules } = impact.recommendation;

  return (
    <div className="flex flex-col gap-6">
      <div className="ci-cols" style={{ gap: '24px 40px' }}>
        <Prose title="Ne oldu?" items={observation} />
        <Prose title="Ne anlama geliyor?" items={interpretation} />
      </div>

      <section>
        <MicroLabel>Önerilen aksiyonlar</MicroLabel>
        {actions.length === 0 ? (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
            Aksiyon gerektiren bir bulgu yok.
          </p>
        ) : (
          <ol className="mt-1.5 ci-cols">
            {actions.map((a, i) => (
              <li key={a.code} className="flex gap-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span
                  className="mt-0.5 text-[13px]"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-source-serif)', fontVariantNumeric: 'tabular-nums' }}
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
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
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
                style={{ backgroundColor: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-sm)' }}
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

/** Asılı madde işaretli editoryal paragraflar. */
function Prose({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <MicroLabel>{title}</MicroLabel>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((t, i) => (
          <li
            key={i}
            className="text-[12.5px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)', textIndent: '-0.9em', paddingLeft: '0.9em' }}
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
    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.11em' }}>
      {children}
    </p>
  );
}
