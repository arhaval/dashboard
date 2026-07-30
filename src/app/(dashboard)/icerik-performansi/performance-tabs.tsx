'use client';

/**
 * İçerik Performansı — iki görünüm:
 *   İçerik Bazlı  : aynı üretimin bütün platformlardaki BİRLEŞİK etkisi (yeni)
 *   Platform Bazlı: platform platform tek tek yayınlar (mevcut ekran, aynen korundu)
 */

import { useState } from 'react';
import { Youtube, Instagram, Layers, Columns3 } from 'lucide-react';
import { ContentPerformanceGrid } from './content-performance-grid';
import { InstagramPerformanceGrid } from './instagram-performance-grid';
import { ContentImpactView } from './content-impact-view';
import type { ScoredVideo } from './perf.constants';
import type { ScoredMedia } from './ig-perf.constants';
import type { ContentImpactPage } from './content-impact.constants';
import type { PlatformHealth } from './integration-health.constants';
import { IntegrationHealthBanner } from './integration-health-banner';

interface Props {
  videos: ScoredVideo[];
  media: ScoredMedia[];
  commentsEnabled: boolean;
  authorsByExternalId: Record<string, string>;
  /** Sunucuda toplanmış İLK sayfa — filtre değişimini server action karşılar. */
  impactPage: ContentImpactPage;
  /** Platform bağlantı durumları. */
  health: PlatformHealth[];
}

export function PerformanceTabs({ videos, media, commentsEnabled, authorsByExternalId, impactPage, health }: Props) {
  const [mode, setMode] = useState<'content' | 'platform'>('content');
  const [tab, setTab] = useState<'youtube' | 'instagram'>('youtube');

  const modes = [
    { id: 'content' as const, label: 'İçerik Bazlı', icon: Layers, count: impactPage.grandTotal },
    { id: 'platform' as const, label: 'Platform Bazlı', icon: Columns3, count: videos.length + media.length },
  ];

  const tabs = [
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube, count: videos.length },
    { id: 'instagram' as const, label: 'Instagram', icon: Instagram, count: media.length },
  ];

  return (
    <div>
      <IntegrationHealthBanner health={health} />

      {/* Görünüm seçimi */}
      <div
        className="mb-4 inline-flex gap-1 rounded-[var(--radius-md)] p-1"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        {modes.map(({ id, label, icon: Icon, count }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors"
              style={active ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-text-muted)' }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {mode === 'content' ? (
        <ContentImpactView initialPage={impactPage} />
      ) : (
        <>
          <div
            className="mb-4 inline-flex gap-1 rounded-[var(--radius-md)] p-1"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            {tabs.map(({ id, label, icon: Icon, count }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
                  style={active ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-text-muted)' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label} <span style={{ opacity: 0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {tab === 'youtube' ? (
            <ContentPerformanceGrid videos={videos} commentsEnabled={commentsEnabled} authorsByExternalId={authorsByExternalId} />
          ) : (
            <InstagramPerformanceGrid media={media} commentsEnabled={commentsEnabled} authorsByExternalId={authorsByExternalId} />
          )}
        </>
      )}
    </div>
  );
}
