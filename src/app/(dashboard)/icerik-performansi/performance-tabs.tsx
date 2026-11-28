'use client';

/**
 * İçerik Performansı — iki görünüm:
 *   İçerik Bazlı  : aynı üretimin bütün platformlardaki BİRLEŞİK etkisi (yeni)
 *   Platform Bazlı: platform platform tek tek yayınlar (mevcut ekran, aynen korundu)
 */

import { useState } from 'react';
import { Youtube, Instagram, Layers, Columns3 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/tabs';
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
      <SegmentedControl
        className="mb-4"
        items={modes.map(({ id, label, icon, count }) => ({ key: id, label, icon, count, active: mode === id, onClick: () => setMode(id) }))}
      />

      {mode === 'content' ? (
        <ContentImpactView initialPage={impactPage} />
      ) : (
        <>
          <SegmentedControl
            className="mb-4"
            items={tabs.map(({ id, label, icon, count }) => ({ key: id, label, icon, count, active: tab === id, onClick: () => setTab(id) }))}
          />

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
