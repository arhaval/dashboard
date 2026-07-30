'use client';

/**
 * İçerik detayı — sağ drawer. Üç bölüm:
 *   A. Toplam Etki        (bütün platformların toplamı + veri kapsamı)
 *   B. Platform Kırılımı  (her platform ayrı ayrı, desteklenmeyen metrik "—")
 *   C. Editoryal Sonuç    (kural motorunun çıktısı — burada `if` bloğu YOK)
 *
 * Bu component karar üretmez, yalnızca ContentImpact'i gösterir.
 */

import { useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { LABEL_META } from './perf.constants';
import {
  CORE_TOTALS,
  DATA_SOURCE_LABELS,
  METRIC_CATALOG,
  METRIC_LABELS,
  METRIC_SHORT_LABELS,
  OVERALL_STATUS_META,
  SCORE_BASIS_LABELS,
  TOTALS_ORDER,
  fmtDate,
  fmtMetricValue,
  fmtRatio,
  isUnsupported,
  metricsFor,
  type ContentImpact,
  type MetricKey,
  type MetricTotal,
  type PlatformMetrics,
  type PlatformPublication,
  type PublicationCheckpoint,
  type RecommendationPriority,
} from './content-impact.constants';
import {
  CHECKPOINT_LABELS,
  MEASUREMENT_QUALITY_LABELS,
  MEASUREMENT_QUALITY_TOOLTIPS,
  type MeasurementQuality,
} from './publication-snapshot.constants';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../icerik-plani/content-queue.constants';

const PRIORITY_META: Record<RecommendationPriority, { text: string; bg: string; color: string }> = {
  HIGH:   { text: 'Yüksek', bg: 'var(--color-error-muted)',   color: 'var(--color-error)' },
  MEDIUM: { text: 'Orta',   bg: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
  LOW:    { text: 'Düşük',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
};

export function ContentImpactDrawer({ impact, onClose }: { impact: ContentImpact; onClose: () => void }) {
  const { totals, comparison, verdict, publications, recommendation } = impact;
  const status = OVERALL_STATUS_META[verdict.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <aside
        className="relative z-10 flex h-full w-full flex-col overflow-y-auto sm:max-w-2xl"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Başlık */}
        <header
          className="sticky top-0 z-10 flex items-start gap-3 px-5 py-4"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}
        >
          {impact.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={impact.thumbnail} alt="" className="h-12 w-20 flex-shrink-0 rounded-[var(--radius-sm)] object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
              {impact.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>#{impact.code}</code>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                İlk yayın: {fmtDate(impact.firstPublishedAt)}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                {status.text}
              </span>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{verdict.note}</p>
          </div>
          <button onClick={onClose} className="rounded p-1" style={{ color: 'var(--color-text-muted)' }} aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-5 py-5">
          {/* ── A. TOPLAM ETKİ ─────────────────────────────────────────────── */}
          <section>
            <SectionTitle>A · Toplam Etki</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Çekirdek metrikler her zaman; diğerleri yalnızca veri geldiyse
                  — 16 kutuluk bir duvar okunmaz hale gelir. */}
              {TOTALS_ORDER.filter(
                (key) => CORE_TOTALS.includes(key) || totals[key]?.value != null
              ).map((key) => (
                <TotalTile
                  key={key}
                  label={METRIC_LABELS[key]}
                  total={totals[key]}
                  metricKey={key}
                  hint={METRIC_CATALOG[key].note}
                />
              ))}
              <TotalTile
                label="Ham etkileşim"
                total={totals.engagements}
                hint="Beğeni + yorum + paylaşım + kaydetme. Ham toplamdır, başarı skoru değildir."
              />
              <div
                className="rounded-[var(--radius-md)] p-2.5"
                style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                  Yayınlanan platform
                </p>
                <p className="mt-1 font-mono text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {publications.length}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Toplamlara yalnızca veri sağlayan platformlar girer — eksik veri sıfır sayılmaz.
            </p>
          </section>

          {/* En güçlü / en zayıf */}
          {(comparison.strongest || comparison.weakest) && (
            <section className="flex flex-col gap-2">
              {comparison.strongest && (
                <RankLine kind="strong" text={comparison.strongest.explanation} />
              )}
              {comparison.weakest ? (
                <RankLine kind="weak" text={comparison.weakest.explanation} />
              ) : (
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Karşılaştırılabilir tek platform var — en zayıf platform belirlenemez.
                </p>
              )}
            </section>
          )}

          {/* ── B. PLATFORM KIRILIMI ───────────────────────────────────────── */}
          <section>
            <SectionTitle>B · Platform Kırılımı</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {publications.map((p) => (
                <PlatformCard key={p.platform} pub={p} />
              ))}
            </div>
          </section>

          {/* ── C. EDİTORYAL SONUÇ ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>C · Editoryal Sonuç</SectionTitle>

            <Block title="Ne oldu?" items={recommendation.observation} />
            <Block title="Ne anlama geliyor?" items={recommendation.interpretation} />

            <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Önerilen aksiyonlar
            </p>
            {recommendation.actions.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                Aksiyon gerektiren bir bulgu yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recommendation.actions.map((a) => {
                  const meta = PRIORITY_META[a.priority];
                  return (
                    <li
                      key={a.code}
                      className="rounded-[var(--radius-md)] p-3"
                      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{a.label}</p>
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.text}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{a.reason}</p>
                      <code className="mt-1.5 block font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{a.code}</code>
                    </li>
                  );
                })}
              </ul>
            )}

            {recommendation.triggeredRules.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Tetiklenen kurallar ({recommendation.triggeredRules.length})
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {recommendation.triggeredRules.map((r) => (
                    <code
                      key={r}
                      className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                    >
                      {r}
                    </code>
                  ))}
                </div>
              </details>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

// ── Parçalar ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
      {children}
    </h3>
  );
}

function TotalTile({ label, total, hint, metricKey }: {
  label: string; total: MetricTotal; hint?: string; metricKey?: MetricKey;
}) {
  const complete = total.available === total.total;
  return (
    <div
      className="rounded-[var(--radius-md)] p-2.5"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
      title={hint}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="mt-1 font-mono text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {metricKey ? fmtMetricValue(metricKey, total.value) : (total.value ?? '—')}
      </p>
      <p
        className="mt-0.5 text-[10px]"
        style={{ color: complete ? 'var(--color-text-muted)' : 'var(--color-warning)' }}
      >
        Veri kapsamı: {total.available}/{total.total} platform
      </p>
    </div>
  );
}

function RankLine({ kind, text }: { kind: 'strong' | 'weak'; text: string }) {
  const Icon = kind === 'strong' ? TrendingUp : TrendingDown;
  const color = kind === 'strong' ? 'var(--color-success)' : 'var(--color-error)';
  return (
    <p className="flex items-start gap-1.5 text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
      <span>
        <b style={{ color: 'var(--color-text-primary)' }}>{kind === 'strong' ? 'En güçlü platform: ' : 'En zayıf platform: '}</b>
        {text}
      </span>
    </p>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
      <ul className="flex flex-col gap-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Ölçüm kalitesi rozeti. Yaklaşık ve kesin ölçümler görsel olarak ayrılır ama
 * büyük uyarı kutusu kurulmaz — bilgi taşısın, ekranı boğmasın.
 */
const QUALITY_STYLE: Record<MeasurementQuality, { bg: string; color: string }> = {
  EXACT_REALTIME: { bg: 'var(--color-success-muted)', color: 'var(--color-success)' },
  APPROX_DAILY_BACKFILL: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
  LATE_MEASUREMENT: { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' },
  PARTIAL_SOURCE_DATA: { bg: 'var(--color-warning-muted)', color: 'var(--color-warning)' },
};

function QualityBadge({ quality }: { quality: MeasurementQuality }) {
  const style = QUALITY_STYLE[quality];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.color }}
      title={MEASUREMENT_QUALITY_TOOLTIPS[quality]}
    >
      {MEASUREMENT_QUALITY_LABELS[quality]}
    </span>
  );
}

/** "Güncel" + ölçülmüş checkpoint'ler. Ölçülmemiş olan seçilemez. */
function CheckpointTabs({ checkpoints, active, onSelect }: {
  checkpoints: PublicationCheckpoint[];
  active: string;
  onSelect: (v: string) => void;
}) {
  const options = [{ key: 'CURRENT', label: 'Güncel', enabled: true, title: 'En son ölçüm' }].concat(
    checkpoints.map((c) => ({
      key: c.key,
      label: CHECKPOINT_LABELS[c.key],
      enabled: c.measured,
      title: c.measured
        ? `${MEASUREMENT_QUALITY_LABELS[c.measurementQuality]} — ${MEASUREMENT_QUALITY_TOOLTIPS[c.measurementQuality]}`
        : 'Henüz oluşmadı — bu noktada ölçüm alınmamış',
    }))
  );

  return (
    <div className="mt-2 inline-flex gap-1 rounded-[var(--radius-sm)] p-0.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
      {options.map((o) => (
        <button
          key={o.key}
          disabled={!o.enabled}
          onClick={() => onSelect(o.key)}
          title={o.title}
          className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-semibold disabled:opacity-35"
          style={
            active === o.key
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { color: 'var(--color-text-muted)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PlatformCard({ pub }: { pub: PlatformPublication }) {
  const c = PLATFORM_COLORS[pub.platform];
  const label = LABEL_META[pub.label];
  const [checkpoint, setCheckpoint] = useState('CURRENT');

  const selected = pub.checkpoints.find((x) => x.key === checkpoint);
  const shown: PlatformMetrics = checkpoint === 'CURRENT' ? pub.metrics : (selected?.metrics ?? pub.metrics);
  const hasHistory = pub.checkpoints.some((x) => x.measured);

  return (
    <div
      className="rounded-[var(--radius-md)] p-3"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: c.bg, color: c.color }}>
          {PLATFORM_LABELS[pub.platform]}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          {DATA_SOURCE_LABELS[pub.source]}
        </span>
        {pub.genreLabel && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pub.genreLabel}</span>
        )}
        <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {fmtDate(pub.publishedAt)}
        </span>
      </div>

      <div className="mt-1.5 flex items-start gap-2">
        <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {pub.title}
        </p>
        {pub.url && (
          <a
            href={pub.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded p-0.5"
            style={{ color: 'var(--color-accent)' }}
            title="Yayına git"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Skor — mevcut platform skoru veya kontrollü fallback */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: label.bg, color: label.color }}>
          {label.text}
        </span>
        {pub.score != null ? (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-mono">{fmtRatio(pub.score)}x</span> · {SCORE_BASIS_LABELS[pub.scoreBasis]}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Karşılaştırılabilir skor yok
          </span>
        )}
      </div>

      {/* 24s / 7g / 30g — yalnızca gerçekten ölçüm varsa seçilebilir */}
      {hasHistory && (
        <CheckpointTabs checkpoints={pub.checkpoints} active={checkpoint} onSelect={setCheckpoint} />
      )}
      {checkpoint !== 'CURRENT' && selected?.measured && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <QualityBadge quality={selected.measurementQuality} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(selected.actualCapturedAt as string).toLocaleString('tr-TR')}
            {selected.isLate && ` · hedeften ${Math.round((selected.delaySeconds ?? 0) / 3600)} saat sonra`}
            {selected.status === 'PARTIAL' && ` · ${selected.laggingSources.join(', ')} verisi geride`}
            {selected.dataThroughDate && ` · veri ${selected.dataThroughDate} tarihine kadar`}
            {' · doluluk %'}{Math.round(selected.dataCompleteness * 100)}
          </span>
        </div>
      )}
      {checkpoint !== 'CURRENT' && selected && !selected.measured && (
        <p className="mt-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Henüz ölçülmedi
        </p>
      )}

      {/* Metrikler — desteklenmeyen alanlarda sahte 0 yok. Platformun hiç
          vermediği metrikler listeye bile girmez. */}
      <dl className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {metricsFor(pub.platform).map((key) => (
          <MetricCell
            key={key}
            metricKey={key}
            value={shown[key]}
            platformSupports={!isUnsupported(pub.platform, key)}
            availability={pub.availability[key]}
            note={key === 'exposure' ? pub.exposureBasis : undefined}
          />
        ))}
      </dl>

      {pub.snapshotCount > 0 && (
        <p className="mt-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {pub.snapshotCount} ölçüm kaydı toplandı.
        </p>
      )}
    </div>
  );
}

/**
 * "Veri yok" (henüz gelmedi) ile "API desteklemiyor" (hiç gelmeyecek) farkı
 * kullanıcıya açıkça gösterilir — ikisi de 0 DEĞİLDİR.
 */
function MetricCell({
  metricKey,
  value,
  platformSupports,
  availability,
  note,
}: {
  metricKey: MetricKey;
  value: number | null;
  platformSupports: boolean;
  availability?: 'OK' | 'UNSUPPORTED' | 'PERMISSION_MISSING' | 'FAILED';
  note?: string;
}) {
  let text: string;
  let title: string | undefined;
  if (value != null) {
    text = fmtMetricValue(metricKey, value);
    title = METRIC_CATALOG[metricKey].note;
  } else if (!platformSupports || availability === 'UNSUPPORTED') {
    text = 'API desteklemiyor';
    title = 'Bu platform/medya türü bu metriği hiç vermiyor';
  } else if (availability === 'PERMISSION_MISSING') {
    text = 'İzin yok';
    title = 'Metrik için gereken izin verilmemiş';
  } else if (availability === 'FAILED') {
    text = 'Alınamadı';
    title = 'Son senkronizasyonda hata alındı; eski değer de yok';
  } else {
    text = 'Veri yok';
    title = 'Henüz ölçülmedi';
  }

  return (
    <div title={title}>
      <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {METRIC_SHORT_LABELS[metricKey]}
        {note && <span className="ml-1 normal-case opacity-70">({note})</span>}
      </dt>
      <dd
        className="font-mono text-[12.5px]"
        style={{ color: value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
      >
        {text}
      </dd>
    </div>
  );
}
