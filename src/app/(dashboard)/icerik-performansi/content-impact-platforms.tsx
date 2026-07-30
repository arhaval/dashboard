'use client';

/**
 * Platform kırılımı — akordiyon satırlar.
 *
 * Eskiden her platform, içinde 14 metrik olan şişman bir kart açıyordu; üç
 * platformlu bir içerikte ekran okunamaz hale geliyordu. Artık kapalıyken tek
 * satır (platform · skor · ana sayı), açıldığında ölçüm noktaları ve metrikler
 * geliyor. Aynı anda yalnızca bir platform açık.
 */

import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { LABEL_META } from './perf.constants';
import {
  DATA_SOURCE_LABELS,
  METRIC_CATALOG,
  METRIC_SHORT_LABELS,
  SCORE_BASIS_LABELS,
  fmtCompact,
  fmtDate,
  fmtMetricValue,
  fmtRatio,
  isUnsupported,
  metricsFor,
  type MetricKey,
  type PlatformMetrics,
  type PlatformPublication,
  type PublicationCheckpoint,
} from './content-impact.constants';
import {
  CHECKPOINT_LABELS,
  MEASUREMENT_QUALITY_LABELS,
  MEASUREMENT_QUALITY_TOOLTIPS,
  type MeasurementQuality,
} from './publication-snapshot.constants';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '../icerik-plani/content-queue.constants';

/** Kalite renkleri — kesin yeşil, çekinceli turuncu, gecikmeli nötr. */
const QUALITY_COLOR: Record<MeasurementQuality, string> = {
  EXACT_REALTIME: 'var(--color-success)',
  APPROX_DAILY_BACKFILL: 'var(--color-warning)',
  LATE_MEASUREMENT: 'var(--color-text-muted)',
  PARTIAL_SOURCE_DATA: 'var(--color-warning)',
};

export function PlatformsPane({ publications }: { publications: PlatformPublication[] }) {
  // İlk platform açık gelir — tek platformlu içerikte fazladan tıklama olmasın.
  const [open, setOpen] = useState<string | null>(publications[0]?.platform ?? null);

  return (
    <div>
      {publications.map((pub) => (
        <PlatformRow
          key={pub.platform}
          pub={pub}
          open={open === pub.platform}
          onToggle={() => setOpen((o) => (o === pub.platform ? null : pub.platform))}
        />
      ))}
    </div>
  );
}

function PlatformRow({ pub, open, onToggle }: {
  pub: PlatformPublication; open: boolean; onToggle: () => void;
}) {
  const [checkpoint, setCheckpoint] = useState('CURRENT');
  const color = PLATFORM_COLORS[pub.platform];
  const label = LABEL_META[pub.label];

  const selected = pub.checkpoints.find((c) => c.key === checkpoint);
  const shown: PlatformMetrics = checkpoint === 'CURRENT' ? pub.metrics : (selected?.metrics ?? pub.metrics);
  const hasHistory = pub.checkpoints.some((c) => c.measured);
  const headline = pub.metrics.exposure;

  return (
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      {/* Kapalı satır: karar için gereken üç şey — platform, skor, erişim. */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-3.5 text-left"
      >
        <ChevronDown
          className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200"
          style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span
          className="w-[84px] flex-shrink-0 text-[12.5px] font-semibold"
          style={{ color: color.color, fontFamily: 'var(--font-display)' }}
        >
          {PLATFORM_LABELS[pub.platform]}
        </span>

        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          {pub.score != null ? (
            <span
              className="font-mono text-[13px] font-semibold"
              style={{ color: label.color, fontVariantNumeric: 'tabular-nums' }}
            >
              {fmtRatio(pub.score)}×
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>skor yok</span>
          )}
          <span className="truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {label.text.replace(/^\S+\s/, '')}
          </span>
        </span>

        <span
          className="flex-shrink-0 font-mono text-[13px]"
          style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {headline == null ? '—' : fmtCompact(headline)}
        </span>
      </button>

      {open && (
        <div className="pb-5 pl-[26px]" style={{ animation: 'ci-fade 220ms ease-out' }}>
          {/* Künye satırı */}
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span>{DATA_SOURCE_LABELS[pub.source]}</span>
            {pub.genreLabel && <span>· {pub.genreLabel}</span>}
            <span>· {fmtDate(pub.publishedAt)}</span>
            {pub.score != null && <span>· {SCORE_BASIS_LABELS[pub.scoreBasis]}</span>}
            {pub.url && (
              <a
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                Yayına git <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Ölçüm noktaları — yalnızca gerçekten ölçüm varsa görünür. */}
          {hasHistory && (
            <CheckpointNav checkpoints={pub.checkpoints} active={checkpoint} onSelect={setCheckpoint} />
          )}

          {checkpoint !== 'CURRENT' && selected?.measured && (
            <p
              className="mb-3 text-[10.5px] leading-relaxed"
              style={{ color: QUALITY_COLOR[selected.measurementQuality] }}
              title={MEASUREMENT_QUALITY_TOOLTIPS[selected.measurementQuality]}
            >
              {MEASUREMENT_QUALITY_LABELS[selected.measurementQuality]}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {' · '}{new Date(selected.actualCapturedAt as string).toLocaleString('tr-TR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {selected.isLate && ` · hedeften ${Math.round((selected.delaySeconds ?? 0) / 3600)} sa sonra`}
                {selected.status === 'PARTIAL' && ' · kaynak verisi geride'}
              </span>
            </p>
          )}

          <MetricGrid platform={pub.platform} metrics={shown} availability={pub.availability} exposureBasis={pub.exposureBasis} />

          {pub.snapshotCount > 0 && (
            <p className="mt-3 text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {pub.snapshotCount} ölçüm kaydı toplandı
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Güncel + ölçülmüş noktalar. Ölçülmemiş nokta seçilemez ama görünür kalır. */
function CheckpointNav({ checkpoints, active, onSelect }: {
  checkpoints: PublicationCheckpoint[]; active: string; onSelect: (v: string) => void;
}) {
  const items = [{ key: 'CURRENT', label: 'Güncel', enabled: true, hint: 'En son ölçüm' }].concat(
    checkpoints.map((c) => ({
      key: c.key,
      label: CHECKPOINT_LABELS[c.key],
      enabled: c.measured,
      hint: c.measured ? MEASUREMENT_QUALITY_TOOLTIPS[c.measurementQuality] : 'Henüz oluşmadı',
    }))
  );

  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <button
          key={i.key}
          disabled={!i.enabled}
          onClick={() => onSelect(i.key)}
          title={i.hint}
          className="pb-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed"
          style={{
            color: active === i.key ? 'var(--color-accent)' : i.enabled ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
            opacity: i.enabled ? 1 : 0.4,
            borderBottom: active === i.key ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
          }}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Metrikler — hizalı tanım listesi. Platformun hiç vermediği metrik listeye
 * girmez; "veri yok" ile "API desteklemiyor" ayrı metinlerle gösterilir.
 */
function MetricGrid({ platform, metrics, availability, exposureBasis }: {
  platform: PlatformPublication['platform'];
  metrics: PlatformMetrics;
  availability: PlatformPublication['availability'];
  exposureBasis: string;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
      {metricsFor(platform).map((key) => (
        <MetricLine
          key={key}
          metricKey={key}
          value={metrics[key]}
          supported={!isUnsupported(platform, key)}
          state={availability[key]}
          note={key === 'exposure' ? exposureBasis : undefined}
        />
      ))}
    </dl>
  );
}

function MetricLine({ metricKey, value, supported, state, note }: {
  metricKey: MetricKey;
  value: number | null;
  supported: boolean;
  state?: 'OK' | 'UNSUPPORTED' | 'PERMISSION_MISSING' | 'FAILED';
  note?: string;
}) {
  let text: string;
  let muted = true;
  let title = METRIC_CATALOG[metricKey].note;

  if (value != null) {
    text = fmtMetricValue(metricKey, value);
    muted = false;
  } else if (!supported || state === 'UNSUPPORTED') {
    text = 'desteklenmiyor';
    title = 'Bu platform/medya türü bu metriği hiç vermiyor';
  } else if (state === 'PERMISSION_MISSING') {
    text = 'izin yok';
    title = 'Metrik için gereken izin verilmemiş';
  } else if (state === 'FAILED') {
    text = 'alınamadı';
    title = 'Son senkronizasyonda hata alındı';
  } else {
    text = 'veri yok';
    title = 'Henüz ölçülmedi';
  }

  return (
    <div
      className="flex items-baseline justify-between gap-2 py-1.5"
      style={{ borderBottom: '1px solid var(--color-border)' }}
      title={title}
    >
      <dt className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {METRIC_SHORT_LABELS[metricKey]}
        {note && <span className="opacity-60"> ({note})</span>}
      </dt>
      <dd
        className="font-mono text-[12px]"
        style={{
          color: muted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: muted ? '10.5px' : undefined,
        }}
      >
        {text}
      </dd>
    </div>
  );
}
