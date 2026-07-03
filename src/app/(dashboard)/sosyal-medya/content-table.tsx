'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  type ContentQueueItem,
  type ContentPlatform,
  type ContentStatus,
} from './content-queue.constants';
import { updateContentStatus, deleteContentItem } from './queue-actions';
import { ContentForm } from './content-form';

const PLATFORM_COLORS: Record<ContentPlatform, { bg: string; color: string }> = {
  YOUTUBE:   { bg: 'rgba(255,0,0,0.12)',       color: '#FF4444' },
  INSTAGRAM: { bg: 'rgba(225,48,108,0.12)',     color: '#E1306C' },
  TWITCH:    { bg: 'rgba(145,70,255,0.12)',     color: '#9146FF' },
  X:         { bg: 'rgba(161,161,161,0.12)',    color: '#A1A1A1' },
};

const STATUS_STYLES: Record<ContentStatus, { bg: string; color: string; next: ContentStatus | null; nextLabel: string }> = {
  HAZIRLANIYOR: { bg: 'rgba(234,179,8,0.12)',  color: '#EAB308', next: 'HAZIR',      nextLabel: '→ Hazır Yap' },
  HAZIR:        { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', next: 'YAYINLANDI', nextLabel: '→ Yayınlandı' },
  YAYINLANDI:   { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', next: null,         nextLabel: '' },
};

const ALL_PLATFORMS = ['TUMU', ...Object.keys(PLATFORM_LABELS)] as const;
const ALL_STATUSES  = ['TUMU', ...Object.keys(STATUS_LABELS)]   as const;

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

interface ContentTableProps {
  items: ContentQueueItem[];
  isAdmin: boolean;
}

export function ContentTable({ items, isAdmin }: ContentTableProps) {
  const [platformFilter, setPlatformFilter] = useState<string>('TUMU');
  const [statusFilter,   setStatusFilter]   = useState<string>('TUMU');
  const [editItem,   setEditItem]   = useState<ContentQueueItem | null>(null);
  const [formOpen,   setFormOpen]   = useState(false);
  const [isPending,  startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    if (platformFilter !== 'TUMU' && item.platform !== platformFilter) return false;
    if (statusFilter   !== 'TUMU' && item.status   !== statusFilter)   return false;
    return true;
  });

  // Group: active first, published last
  const active    = filtered.filter((i) => i.status !== 'YAYINLANDI');
  const published = filtered.filter((i) => i.status === 'YAYINLANDI');
  const sorted    = [...active, ...published];

  function openAdd() {
    setEditItem(null);
    setFormOpen(true);
  }

  function openEdit(item: ContentQueueItem) {
    setEditItem(item);
    setFormOpen(true);
  }

  function handleAdvanceStatus(item: ContentQueueItem) {
    const next = STATUS_STYLES[item.status].next;
    if (!next) return;
    startTransition(async () => { await updateContentStatus(item.id, next); });
  }

  function handleDelete(id: string) {
    if (!confirm('Bu içeriği silmek istediğine emin misin?')) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteContentItem(id);
      setDeletingId(null);
    });
  }

  return (
    <div>
      {/* Filters + Add Button */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Platform filter */}
        <div className="flex gap-1">
          {ALL_PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                platformFilter === p
                  ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                  : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
              {p === 'TUMU' ? 'Tümü' : PLATFORM_LABELS[p as ContentPlatform]}
            </button>
          ))}
        </div>

        <div className="h-4 w-px" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Status filter */}
        <div className="flex gap-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                statusFilter === s
                  ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                  : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
              {s === 'TUMU' ? 'Tümü' : STATUS_LABELS[s as ContentStatus]}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Yeni İçerik
          </Button>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div
          className="rounded-[var(--radius-md)] p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {items.length === 0
              ? 'Henüz içerik eklenmemiş. İlk içeriği eklemek için "Yeni İçerik" butonuna tıkla.'
              : 'Bu filtreyle eşleşen içerik yok.'}
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-[var(--radius-md)]"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                {['Platform', 'Tür', 'Başlık', 'Planlı Tarih', 'Notlar', 'Durum', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const platStyle = PLATFORM_COLORS[item.platform];
                const statStyle = STATUS_STYLES[item.status];
                const isDeleting = deletingId === item.id;
                const isPublished = item.status === 'YAYINLANDI';

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface-1)' : 'var(--color-surface-2)',
                      borderBottom: '1px solid var(--color-border)',
                      opacity: isPublished ? 0.6 : 1,
                    }}
                  >
                    {/* Platform */}
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: platStyle.bg, color: platStyle.color }}
                      >
                        {PLATFORM_LABELS[item.platform]}
                      </span>
                    </td>

                    {/* Tür */}
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.content_type}
                      </span>
                    </td>

                    {/* Başlık */}
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)', maxWidth: 260 }}>
                      <span className="line-clamp-2">{item.title}</span>
                    </td>

                    {/* Planlı Tarih */}
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(item.planned_date)}
                    </td>

                    {/* Notlar */}
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)', maxWidth: 200 }}>
                      <span className="line-clamp-1 text-xs">{item.notes || '—'}</span>
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      {statStyle.next ? (
                        <button
                          onClick={() => handleAdvanceStatus(item)}
                          disabled={isPending}
                          title={statStyle.nextLabel}
                          className="rounded px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ backgroundColor: statStyle.bg, color: statStyle.color }}
                        >
                          {STATUS_LABELS[item.status]}
                        </button>
                      ) : (
                        <span
                          className="rounded px-2.5 py-1 text-xs font-semibold"
                          style={{ backgroundColor: statStyle.bg, color: statStyle.color }}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded p-1.5 transition-colors hover:bg-white/10"
                          title="Düzenle"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {(isAdmin || true) && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting}
                            className="rounded p-1.5 transition-colors hover:bg-red-500/10"
                            title="Sil"
                            style={{ color: 'var(--color-error)' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ContentForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        item={editItem}
      />
    </div>
  );
}
