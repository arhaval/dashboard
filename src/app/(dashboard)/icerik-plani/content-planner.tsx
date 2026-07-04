'use client';

import { useState } from 'react';
import { LayoutGrid, CalendarDays } from 'lucide-react';
import { ContentKanban } from './content-kanban';
import { ContentCalendar } from './content-calendar';
import type { ContentQueueItem } from './content-queue.constants';

type View = 'kanban' | 'calendar';

interface ContentPlannerProps {
  items: ContentQueueItem[];
}

export function ContentPlanner({ items }: ContentPlannerProps) {
  const [view, setView] = useState<View>('kanban');

  const tabs: { id: View; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'kanban', label: 'Pano', icon: LayoutGrid },
    { id: 'calendar', label: 'Takvim', icon: CalendarDays },
  ];

  return (
    <div>
      {/* View toggle */}
      <div
        className="mb-4 inline-flex gap-1 rounded-[var(--radius-md)] p-1"
        style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {view === 'kanban' ? (
        <ContentKanban items={items} />
      ) : (
        <ContentCalendar items={items} />
      )}
    </div>
  );
}
