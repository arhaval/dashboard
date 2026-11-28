/**
 * Sağ profil paneli (Tessera) — tüm dashboard'lar kullanır.
 * Banner + avatar + kimlik · bilgi kutuları · ilerleme · yaklaşanlar · özet
 * kartı. Gezinme bağlantıları burada tekrar edilmez (sidebar'da).
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Pencil, BadgeCheck, Clock, Calendar, Users, Sparkles, type LucideIcon } from 'lucide-react';

export interface PanelUpcoming { id: string; title: string; when: string; href: string }

interface ProfilePanelProps {
  userId: string;
  fullName: string;
  handle: string;
  avatarUrl: string | null;
  initials: string;
  tiles: [{ label: string; value: string }, { label: string; value: string }];
  progress: { label: string; pct: number };
  /** Verilmezse "Yaklaşan" bölümü hiç basılmaz (ör. planlar sayfa üstünde gösteriliyorsa). */
  upcoming?: PanelUpcoming[];
  summary: { title: string; text: string; primary: { href: string; label: string } };
  className?: string;
}

const UPCOMING_ICONS: { icon: LucideIcon; color: string; bg: string }[] = [
  { icon: Clock, color: 'var(--color-accent)', bg: 'var(--color-accent-muted)' },
  { icon: Calendar, color: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
  { icon: Users, color: 'var(--color-success)', bg: 'var(--color-success-muted)' },
];

const TILE = 'rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-3.5 py-3';

export function ProfilePanel(p: ProfilePanelProps) {
  const pct = Math.max(0, Math.min(100, Math.round(p.progress.pct)));
  return (
    <aside className={cn('flex flex-col gap-5 border-[var(--color-border)] p-3 xl:border-l', p.className)}>
      {/* Banner + avatar */}
      <div>
        <div className="relative h-28 rounded-[var(--radius-lg)]" style={{ backgroundImage: 'var(--gradient-banner)' }}>
          <Link
            href={`/team/${p.userId}`}
            title="Profili düzenle"
            aria-label="Profili düzenle"
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/40 text-black/70 backdrop-blur-sm transition-colors hover:bg-white/60"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="px-3">
          <div className="relative z-10 -mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--color-bg-primary)] bg-[var(--color-accent-muted)] text-2xl font-bold text-[var(--color-accent)]">
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatarUrl} alt={p.fullName} className="h-full w-full object-cover" />
            ) : (
              p.initials
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <h2 className="truncate text-lg font-semibold text-[var(--color-text-primary)]">{p.fullName}</h2>
            <BadgeCheck className="h-5 w-5 flex-shrink-0" style={{ fill: 'var(--color-accent)', color: 'var(--color-text-primary)' }} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="truncate">@{p.handle}</span>
            <span className="rounded-md bg-[var(--color-success-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-success)]">Çevrimiçi</span>
          </div>

        </div>
      </div>

      <div className="space-y-2.5 px-3">
        <div className="grid grid-cols-2 gap-2.5">
          {p.tiles.map((t) => (
            <div key={t.label} className={TILE}>
              <p className="text-xs text-[var(--color-text-muted)]">{t.label}</p>
              <p className="mt-1 truncate text-sm font-medium text-[var(--color-text-primary)]">{t.value}</p>
            </div>
          ))}
        </div>

        <div className={TILE}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-[var(--color-text-secondary)]">{p.progress.label}</span>
            <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{pct}%</span>
          </div>
          <div className="relative mt-3 flex h-3.5 items-center">
            <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundImage: 'var(--gradient-progress)' }} />
            <span className="absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-[var(--color-bg-secondary)] bg-[var(--color-text-primary)]" style={{ left: `${pct}%` }} />
            <div className="ml-2.5 h-2 flex-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--color-border-hover) 0 2px, transparent 2px 6px)' }} />
          </div>
        </div>
      </div>

      {p.upcoming && (
      <div className="px-3">
        <h3 className="mb-3 text-[15px] font-semibold text-[var(--color-text-primary)]">Yaklaşan</h3>
        {p.upcoming.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Planlı iş yok</p>
        ) : (
          <ul className="space-y-3.5">
            {p.upcoming.map((u, i) => {
              const s = UPCOMING_ICONS[i % UPCOMING_ICONS.length];
              const UIcon = s.icon;
              return (
                <li key={u.id}>
                  <Link href={u.href} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)]" style={{ background: s.bg, color: s.color }}>
                      <UIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">{u.title}</span>
                      <span className="block text-xs text-[var(--color-text-muted)]">{u.when}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}

      <div className="relative mt-auto overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: 'radial-gradient(var(--color-border-hover) 1px, transparent 1px)', backgroundSize: '10px 10px',
          WebkitMaskImage: 'linear-gradient(225deg, black, transparent 60%)', maskImage: 'linear-gradient(225deg, black, transparent 60%)',
        }} />
        <div className="relative">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-hover)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{p.summary.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{p.summary.text}</p>
          <div className="mt-4">
            <Link href={p.summary.primary.href} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-text-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-bg-primary)] transition-opacity hover:opacity-90">
              <Sparkles className="h-3.5 w-3.5" /> {p.summary.primary.label}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
