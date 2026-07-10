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
  PUBLISH_PLATFORMS, PLATFORM_COLORS, extractYouTubeId, extractInstagramShortcode,
  type ContentPlatform, type ContentQueueItem, type PublicationInput,
} from './content-queue.constants';
import { publishContent } from './queue-actions';

interface Row { checked: boolean; url: string; views: string; likes: string }

const emptyRow: Row = { checked: false, url: '', views: '', likes: '' };

export function PublishModal({ item, onClose }: { item: ContentQueueItem; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const p of PUBLISH_PLATFORMS) {
      // Pre-tick the platforms the card was planned for.
      init[p.value] = { ...emptyRow, checked: item.platforms.includes(p.value) };
    }
    return init;
  });

  function patch(platform: string, next: Partial<Row>) {
    setRows((prev) => ({ ...prev, [platform]: { ...prev[platform], ...next } }));
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

      pubs.push({
        platform: p.value,
        url,
        external_id: externalId,
        views: p.auto ? null : (r.views.trim() ? Number(r.views) : null),
        likes: p.auto ? null : (r.likes.trim() ? Number(r.likes) : null),
      });
    }

    if (pubs.length === 0) { setError('En az bir platform seç.'); return; }

    start(async () => {
      const res = await publishContent(item.id, pubs);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  const numCls = 'w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#0B1437]/50 backdrop-blur-sm" onClick={() => !isPending && onClose()} />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-[var(--radius-lg)] sm:p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Yayınla</h3>
        <p className="mb-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Hangi platformlara attıysan işaretle. YouTube ve Instagram&apos;ın sayıları otomatik gelir; diğerlerini elle gir.
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
                      <div className="grid grid-cols-2 gap-2">
                        <input value={r.views} onChange={(e) => patch(p.value, { views: e.target.value })}
                          placeholder="İzlenme" type="number" min="0" className={numCls} style={fieldStyle} />
                        <input value={r.likes} onChange={(e) => patch(p.value, { likes: e.target.value })}
                          placeholder="Beğeni" type="number" min="0" className={numCls} style={fieldStyle} />
                      </div>
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
          <Button type="button" onClick={submit} disabled={isPending}>{isPending ? 'Yayınlanıyor…' : 'Yayınla ✓'}</Button>
        </div>
      </div>
    </div>
  );
}
