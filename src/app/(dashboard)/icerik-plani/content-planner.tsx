'use client';

import { useState } from 'react';
import { CalendarDays, LayoutGrid, List } from 'lucide-react';
import { ContentKanban } from './content-kanban';
import { ContentCalendar } from './content-calendar';
import { ContentTable } from './content-table';
import type { ContentQueueItem } from './content-queue.constants';

type View = 'list' | 'kanban' | 'calendar';

interface ContentPlannerProps {
  items: ContentQueueItem[];
  canEdit?: boolean;
  handoffStages?: string[];
  voicePeople?: { id: string; name: string }[];
  publicationsByCard?: Record<string, import('./content-queue.constants').PublicationInput[]>;
}

export function ContentPlanner({ items, canEdit = true, handoffStages = [], voicePeople = [], publicationsByCard = {} }: ContentPlannerProps) {
  // Liste varsayılan: "ne yapıldı, ne yapılmadı, kimde bekliyor" sorusunun
  // cevabı tek ekranda. Pano akışı, Takvim yayın gününü göstermek için kalıyor.
  const [view, setView] = useState<View>('list');

  // Viewers get the read-only list + board; the calendar is an editing surface.
  const tabs: { id: View; label: string; icon: typeof LayoutGrid }[] = canEdit
    ? [
        { id: 'list', label: 'Liste', icon: List },
        { id: 'kanban', label: 'Pano', icon: LayoutGrid },
        { id: 'calendar', label: 'Takvim', icon: CalendarDays },
      ]
    : [
        { id: 'list', label: 'Liste', icon: List },
        { id: 'kanban', label: 'Pano', icon: LayoutGrid },
      ];

  const activeView: View = !canEdit && view === 'calendar' ? 'list' : view;

  return (
    <div>
      {/* View toggle */}
      <div
        className="mb-4 inline-flex gap-1 rounded-[var(--radius-md)] p-1"
        style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
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

      {activeView === 'list' && (
        <ContentTable items={items} canEdit={canEdit} handoffStages={handoffStages} voicePeople={voicePeople} publicationsByCard={publicationsByCard} />
      )}
      {activeView === 'kanban' && (
        <ContentKanban items={items} canEdit={canEdit} handoffStages={handoffStages} voicePeople={voicePeople} publicationsByCard={publicationsByCard} />
      )}
      {activeView === 'calendar' && (
        <ContentCalendar items={items} voicePeople={voicePeople} />
      )}
    </div>
  );
}
