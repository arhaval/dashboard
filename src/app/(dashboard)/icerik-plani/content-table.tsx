'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, ExternalLink } from 'lucide-react';
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  STATUS_LABELS,
  type ContentQueueItem,
  type ContentPlatform,
  type ContentStatus,
} from './content-queue.constants';
import { updateContentStatus, deleteContentItem } from './queue-actions';
import { ContentForm } from './content-form';

const STATUS_STYLES: Record<ContentStatus, { bg: string; color: string; next: ContentStatus | null; nextLabel: string }> = {
  HAZIRLANIYOR: { bg: 'rgba(234,179,8,0.12)',  color: '#EAB308', next: 'HAZIR',      nextLabel: '→ Hazır Yap'    },
  HAZIR:        { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', next: 'YAYINLANDI', nextLabel: '→ Yayınlandı'   },
  YAYINLANDI:   { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', next: null,         nextLabel: ''               },
};

const ALL_PLATFORMS = ['TUMU', ...Object.keys(PLATFORM_LABELS)] as const;
const ALL_STATUSES  = ['TUMU', ...Object.keys(STATUS_LABELS)]   as const;

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function ProductionDots({ item }: { item: ContentQueueItem }) {
  return (
    <div className="flex items-center gap-1" title={`Metin: ${item.has_text ? '✓' : '✗'} | Ses: ${item.has_voice ? '✓' : '✗'} | Video: ${item.has_video ? '✓' : '✗'}`}>
      {[
        { done: item.has_text,  label: 'M' },
        { done: item.has_voice, label: 'S' },
        { done: item.has_video, label: 'V' },
      ].map(({ done, label }) => (
        <span
          key={label}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            backgroundColor: done ? 'rgba(34,197,94,0.15)' : 'var(--color-surface-2)',
            color: done ? '#22C55E' : 'var(--color-text-muted)',
            border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : 'var(--color-border)'}`,
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

interface ExpandedRowProps {
  item: ContentQueueItem;
  onEdit: () => void;
}

function ExpandedRow({ item, onEdit }: ExpandedRowProps) {
  return (
    <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
      <td colSpan={8} className="px-4 pb-4 pt-0">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Metin */}
          {item.content_text && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                İçerik Metni / Script
              </p>
              <div
                className="max-h-40 overflow-y-auto rounded-[var(--radius-sm)] p-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {item.content_text}
              </div>
            </div>
          )}

          {/* Linkler + Üretim */}
          <div className="space-y-3">
            {(item.voice_url || item.video_url) && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Dosyalar
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.voice_url && (
                    <a href={item.voice_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}>
                      🎙 Ses Dosyası <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {item.video_url && (
                    <a href={item.video_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                      🎬 Video Dosyası <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Üretim Adımları
              </p>
              <div className="flex gap-3">
                {[
                  { done: item.has_text,  label: 'Metin' },
                  { done: item.has_voice, label: 'Ses'   },
                  { done: item.has_video, label: 'Video' },
                ].map(({ done, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs"
                    style={{ color: done ? '#22C55E' : 'var(--color-text-muted)' }}>
                    <span>{done ? '✓' : '○'}</span> {label}
                  </span>
                ))}
              </div>
            </div>

            {item.notes && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Not</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.notes}</p>
              </div>
            )}

            <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}>
              <Pencil className="h-3 w-3" /> Düzenle
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

interface ContentTableProps {
  items: ContentQueueItem[];
  isAdmin: boolean;
}

export function ContentTable({ items, isAdmin }: ContentTableProps) {
  const [platformFilter, setPlatformFilter] = useState<string>('TUMU');
  const [statusFilter,   setStatusFilter]   = useState<string>('TUMU');
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  const [editItem,       setEditItem]       = useState<ContentQueueItem | null>(null);
  const [formOpen,       setFormOpen]       = useState(false);
  const [isPending,      startTransition]   = useTransition();
  const [deletingId,     setDeletingId]     = useState<string | null>(null);

  const filtered = items.filter((item) => {
    if (platformFilter !== 'TUMU' && !item.platforms.includes(platformFilter as ContentPlatform)) return false;
    if (statusFilter   !== 'TUMU' && item.status !== statusFilter) return false;
    return true;
  });

  const active    = filtered.filter((i) => i.status !== 'YAYINLANDI');
  const published = filtered.filter((i) => i.status === 'YAYINLANDI');
  const sorted    = [...active, ...published];

  function openAdd() { setEditItem(null); setFormOpen(true); }
  function openEdit(item: ContentQueueItem) { setEditItem(item); setFormOpen(true); }
  function toggleExpand(id: string) { setExpandedId((prev) => (prev === id ? null : id)); }

  function handleAdvanceStatus(item: ContentQueueItem) {
    const next = STATUS_STYLES[item.status].next;
    if (!next) return;
    startTransition(async () => { await updateContentStatus(item.id, next); });
  }

  function handleDelete(id: string) {
    if (!confirm('Bu içeriği silmek istediğine emin misin?')) return;
    setDeletingId(id);
    startTransition(async () => { await deleteContentItem(id); setDeletingId(null); });
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {ALL_PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
              style={platformFilter === p
                ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              {p === 'TUMU' ? 'Tümü' : PLATFORM_LABELS[p as ContentPlatform]}
            </button>
          ))}
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="flex gap-1">
          {ALL_STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors"
              style={statusFilter === s
                ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
                : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              {s === 'TUMU' ? 'Tümü' : STATUS_LABELS[s as ContentStatus]}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni İçerik
          </Button>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rounded-[var(--radius-md)] p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {items.length === 0
              ? 'Henüz içerik eklenmemiş. "Yeni İçerik" butonuna tıkla.'
              : 'Bu filtreyle eşleşen içerik yok.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)]" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                {['Platformlar', 'Format', 'Başlık', 'Üretim', 'Planlı Tarih', 'Durum', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const statStyle  = STATUS_STYLES[item.status];
                const isExpanded = expandedId === item.id;
                const isDeleting = deletingId === item.id;
                const isPublished = item.status === 'YAYINLANDI';

                return (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => toggleExpand(item.id)}
                      className="cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isExpanded
                          ? 'var(--color-surface-2)'
                          : idx % 2 === 0 ? 'var(--color-surface-1)' : 'var(--color-surface-2)',
                        borderBottom: isExpanded ? 'none' : '1px solid var(--color-border)',
                        opacity: isPublished ? 0.65 : 1,
                      }}
                    >
                      {/* Platformlar */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.platforms.map((p) => {
                            const c = PLATFORM_COLORS[p];
                            return (
                              <span key={p} className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: c.bg, color: c.color }}>
                                {PLATFORM_LABELS[p]}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Format */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.content_type}</span>
                      </td>

                      {/* Başlık */}
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)', maxWidth: 220 }}>
                        <span className="line-clamp-2">{item.title}</span>
                      </td>

                      {/* Üretim */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ProductionDots item={item} />
                      </td>

                      {/* Tarih */}
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(item.planned_date)}
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {statStyle.next ? (
                          <button onClick={() => handleAdvanceStatus(item)} disabled={isPending}
                            title={statStyle.nextLabel}
                            className="rounded px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-70"
                            style={{ backgroundColor: statStyle.bg, color: statStyle.color }}>
                            {STATUS_LABELS[item.status]}
                          </button>
                        ) : (
                          <span className="rounded px-2.5 py-1 text-xs font-semibold"
                            style={{ backgroundColor: statStyle.bg, color: statStyle.color }}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        )}
                      </td>

                      {/* İşlemler */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(item.id)} disabled={isDeleting}
                          className="rounded p-1.5 transition-colors hover:bg-red-500/10"
                          title="Sil" style={{ color: 'var(--color-error)' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <ExpandedRow key={`${item.id}-expanded`} item={item} onEdit={() => { setExpandedId(null); openEdit(item); }} />
                    )}
                  </>
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
