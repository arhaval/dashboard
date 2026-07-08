'use client';

import { useState } from 'react';
import { Youtube, Instagram } from 'lucide-react';
import { ContentPerformanceGrid } from './content-performance-grid';
import { InstagramPerformanceGrid } from './instagram-performance-grid';
import type { ScoredVideo } from './perf.constants';
import type { ScoredMedia } from './ig-perf.constants';

interface Props {
  videos: ScoredVideo[];
  media: ScoredMedia[];
  commentsEnabled: boolean;
}

export function PerformanceTabs({ videos, media, commentsEnabled }: Props) {
  const [tab, setTab] = useState<'youtube' | 'instagram'>('youtube');

  const tabs = [
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube, count: videos.length },
    { id: 'instagram' as const, label: 'Instagram', icon: Instagram, count: media.length },
  ];

  return (
    <div>
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
        <ContentPerformanceGrid videos={videos} commentsEnabled={commentsEnabled} />
      ) : (
        <InstagramPerformanceGrid media={media} commentsEnabled={commentsEnabled} />
      )}
    </div>
  );
}
