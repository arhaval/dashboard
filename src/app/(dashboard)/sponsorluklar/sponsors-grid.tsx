'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Building2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SponsorFormModal } from './sponsor-form-modal';
import { deleteSponsor } from './actions';
import { STATUS_META, type Sponsor } from './sponsor.constants';

type SponsorWithLogo = Sponsor & { logoUrl: string | null };

function formatDate(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function SponsorCard({ s, onEdit, onDelete }: { s: SponsorWithLogo; onEdit: () => void; onDelete: () => void }) {
  const meta = STATUS_META[s.status];
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[var(--radius-lg)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      <Link href={`/sponsorluklar/${s.id}`} className="block">
        <div className="flex h-32 items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <Building2 className="h-10 w-10" style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Link href={`/sponsorluklar/${s.id}`} className="truncate text-sm font-semibold hover:underline" style={{ color: 'var(--color-text-primary)' }}>
            {s.name}
          </Link>
          <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        </div>

        {(s.start_date || s.end_date) && (
          <p className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(s.start_date)}{s.end_date ? ` – ${formatDate(s.end_date)}` : ''}
          </p>
        )}

        <div className="mt-3 flex items-center gap-1.5 border-t pt-2.5" style={{ borderColor: 'var(--color-border)' }}>
          <Link href={`/sponsorluklar/${s.id}`} className="flex-1 rounded-[var(--radius-sm)] border py-1.5 text-center text-xs font-medium transition-colors hover:bg-[var(--color-bg-tertiary)]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            Detay & Dosyalar
          </Link>
          <button onClick={onEdit} className="rounded p-1.5 transition-colors hover:bg-black/5" title="Düzenle" style={{ color: 'var(--color-text-muted)' }}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded p-1.5 transition-colors hover:bg-red-500/10" title="Sil" style={{ color: 'var(--color-error)' }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SponsorsGrid({ sponsors }: { sponsors: SponsorWithLogo[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(s: Sponsor) { setEditing(s); setFormOpen(true); }
  function handleDelete(s: Sponsor) {
    if (!confirm(`${s.name} sponsorunu ve tüm dosyalarını silmek istediğine emin misin?`)) return;
    startTransition(async () => { await deleteSponsor(s.id); });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sponsors.length} sponsor</p>
        <Button onClick={openAdd} size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni Sponsor</Button>
      </div>

      {sponsors.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-10 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Henüz sponsor yok. "Yeni Sponsor" ile ekle.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sponsors.map((s) => (
            <SponsorCard key={s.id} s={s} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s)} />
          ))}
        </div>
      )}

      <SponsorFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} sponsor={editing} />
    </div>
  );
}
