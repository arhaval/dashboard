import { CalendarDays } from 'lucide-react';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '../../icerik-plani/content-queue.constants';
import type { AssignedContent } from '@/services/content-queue.service';

function formatDate(d: string | null): string {
  if (!d) return 'Tarih yok';
  const [y, m, day] = d.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

export function MemberAssignedContent({ items }: { items: AssignedContent[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border p-6 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Şu an sana düşen içerik yok.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{item.stage_label}</span>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.title}</span>
          <div className="flex items-center gap-1.5">
            {item.platforms.map((p) => (
              <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: PLATFORM_COLORS[p].bg, color: PLATFORM_COLORS[p].color }}>{PLATFORM_LABELS[p]}</span>
            ))}
          </div>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(item.planned_date)}
          </span>
        </div>
      ))}
    </div>
  );
}
