'use client';

/**
 * Publishing a card: tick the platforms it actually went out on and paste each
 * link. YouTube/Instagram have API integrations, so their numbers fill in by
 * themselves — for TikTok / X / Twitch you type views and likes yourself.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  PUBLISH_PLATFORMS, PLATFORM_COLORS, MANUAL_METRIC_FIELDS, extractYouTubeId, extractInstagramShortcode,
  toLocalDateTimeInput, fromLocalDateTimeInput,
  type ContentPlatform, type ContentQueueItem, type ManualMetricField, type PublicationInput,
} from './content-queue.constants';
import { publishContent, updatePublications } from './queue-actions';

type MetricValues = Record<ManualMetricField, string>;

interface Row { checked: boolean; url: string; publishedAt: string; metrics: MetricValues }

const emptyMetrics = (): MetricValues =>
  Object.fromEntries(MANUAL_METRIC_FIELDS.map((f) => [f.key, ''])) as MetricValues;

const emptyRow = (): Row => ({ checked: false, url: '', publishedAt: '', metrics: emptyMetrics() });

/** Gösterim (impressions) yalnızca X'te anlamlı — izlenme ile aynı şey değil. */
function fieldsFor(platform: ContentPlatform) {
  return MANUAL_METRIC_FIELDS.filter((f) => f.key !== 'impressions' || platform === 'X');
}

const numOrNull = (s: string): number | null => (s.trim() ? Number(s) : null);

export function PublishModal({ item, existing, onClose }: {
  item: ContentQueueItem;
  /** When given, the card is already published — we're editing its records. */
  existing?: PublicationInput[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const editing = Boolean(existing);

  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const p of PUBLISH_PLATFORMS) {
      const prev = existing?.find((e) => e.platform === p.value);
      if (!prev) {
        // Pre-tick the platforms the card was planned for.
        init[p.value] = { ...emptyRow(), checked: !editing && item.platforms.includes(p.value) };
        continue;
      }
      const metrics = emptyMetrics();
      for (const f of MANUAL_METRIC_FIELDS) {
        const v = prev[f.key];
        if (v != null) metrics[f.key] = String(v);
      }
      init[p.value] = {
        checked: true,
        url: prev.url ?? '',
        publishedAt: toLocalDateTimeInput(prev.published_at),
        metrics,
      };
    }
    return init;
  });

  function patch(platform: string, next: Partial<Row>) {
    setRows((prev) => ({ ...prev, [platform]: { ...prev[platform], ...next } }));
  }

  function patchMetric(platform: string, key: ManualMetricField, value: string) {
    setRows((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], metrics: { ...prev[platform].metrics, [key]: value } },
    }));
  }

  function submit() {
    setError(null);
    const pubs: PublicationInput[] = [];

    for (const p of PUBLISH_PLATFORMS) {
      const r = rows[p.value];
      if (!r.checked) continue;

      const url = r.url.trim() || null;
      let externalId: string | null = null;
      if (p.value === 'YOUTUBE' && url) {
        externalId = extractYouTubeId(url);
        if (!externalId) { setError('YouTube linki tanınmadı. Video linkini yapıştır.'); return; }
      }
      if (p.value === 'INSTAGRAM' && url) {
        externalId = extractInstagramShortcode(url);
        if (!externalId) { setError('Instagram gönderi linki tanınmadı.'); return; }
      }

      // API platformlarının sayıları canlı çözülür — elle girilmez, null kalır.
      pubs.push({
        platform: p.value,
        url,
        external_id: externalId,
        views: p.auto ? null : numOrNull(r.metrics.views),
        likes: p.auto ? null : numOrNull(r.metrics.likes),
        comments: p.auto ? null : numOrNull(r.metrics.comments),
        impressions: p.auto ? null : numOrNull(r.metrics.impressions),
        shares: p.auto ? null : numOrNull(r.metrics.shares),
        saves: p.auto ? null : numOrNull(r.metrics.saves),
        followers_gained: p.auto ? null : numOrNull(r.metrics.followers_gained),
        published_at: p.auto ? null : fromLocalDateTimeInput(r.publishedAt),
      });
    }

    if (pubs.length === 0) { setError('En az bir platform seç.'); return; }

    start(async () => {
      const res = editing ? await updatePublications(item.id, pubs) : await publishContent(item.id, pubs);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  const numCls = 'w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-[var(--radius-lg)] sm:p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {editing ? 'Yayın Bilgileri' : 'Yayınla'}
        </h3>
        <p className="mb-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {editing
            ? 'Linki düzelt, eksik platformu ekle veya TikTok/X sayılarını güncelle. YouTube ve Instagram kendiliğinden tazelenir.'
            : "Hangi platformlara attıysan işaretle. YouTube ve Instagram'ın sayıları otomatik gelir; diğerlerini elle gir."}
        </p>

        <div className="space-y-2.5">
          {PUBLISH_PLATFORMS.map((p) => {
            const r = rows[p.value];
            const c = PLATFORM_COLORS[p.value as ContentPlatform];
            return (
              <div key={p.value} className="rounded-[var(--radius-sm)] p-2.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={r.checked} onChange={(e) => patch(p.value, { checked: e.target.checked })} className="accent-[var(--color-accent)]" />
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.color }}>{p.label}</span>
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {p.auto ? 'otomatik' : 'elle'}
                  </span>
                </label>

                {r.checked && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={r.url}
                      onChange={(e) => patch(p.value, { url: e.target.value })}
                      placeholder={p.auto ? `${p.label} linki (zorunlu)` : `${p.label} linki (opsiyonel)`}
                      type="url"
                      className={numCls}
                      style={fieldStyle}
                    />
                    {!p.auto && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {fieldsFor(p.value).map((f) => (
                            <input
                              key={f.key}
                              value={r.metrics[f.key]}
                              onChange={(e) => patchMetric(p.value, f.key, e.target.value)}
                              placeholder={f.label}
                              title={f.hint ?? f.label}
                              type="number"
                              min="0"
                              className={numCls}
                              style={fieldStyle}
                            />
                          ))}
                        </div>

                        {/*
                          Yayın anı kendi satırında: ölçüm noktaları (24 saat /
                          7 gün / 30 gün) buna göre hesaplandığı için SAAT de
                          gerekiyor — gece yarısı varsayımı 24 saatlik ölçümü
                          gerçek 24. saatten önce kapatıyordu.
                        */}
                        <label className="block">
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            Yayın anı — {p.label} (saatiyle)
                          </span>
                          <input
                            value={r.publishedAt}
                            onChange={(e) => patch(p.value, { publishedAt: e.target.value })}
                            title="Bu platformda gerçekten yayınlandığı tarih ve saat"
                            type="datetime-local"
                            className={`${numCls} mt-1`}
                            style={fieldStyle}
                          />
                        </label>

                        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                          Boş bıraktığın sayı alanı “veri yok” sayılır, sıfır sayılmaz.
                          Yayın anını boş bırakırsan kartın yayın günü (gece yarısı) kullanılır —
                          bu da 24 saatlik ölçümü kaydırır, o yüzden saati gir.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>İptal</Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? 'Kaydediliyor…' : editing ? 'Kaydet' : 'Yayınla ✓'}
          </Button>
        </div>
      </div>
    </div>
  );
}
