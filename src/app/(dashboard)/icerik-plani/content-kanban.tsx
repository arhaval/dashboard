'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type ContentQueueItem,
  type ContentPlatform,
  type ContentStatus,
  type UpdateContentQueueInput,
} from './content-queue.constants';
import { advanceContentStage, deleteContentItem, assignContentPerson } from './queue-actions';
import { ContentForm } from './content-form';

// ── Pipeline stage derivation ──────────────────────────────────────────────────

type Stage = 'METIN' | 'SES' | 'EDITOR' | 'HAZIR' | 'YAYINLANDI';

interface StageConfig {
  id: Stage;
  label: string;
  color: string;
  bg: string;
  borderColor: string;
  advance: (item: ContentQueueItem) => UpdateContentQueueInput | null;
  advanceLabel: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'METIN',
    label: 'Metin Yazılıyor',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.07)',
    borderColor: 'rgba(234,179,8,0.25)',
    advance: () => ({ has_text: true }),
    advanceLabel: 'Metin Tamam →',
  },
  {
    id: 'SES',
    label: 'Ses Bekleniyor',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.07)',
    borderColor: 'rgba(59,130,246,0.25)',
    advance: () => ({ has_voice: true }),
    advanceLabel: 'Ses Atıldı →',
  },
  {
    id: 'EDITOR',
    label: 'Editörde',
    color: '#9146FF',
    bg: 'rgba(145,70,255,0.07)',
    borderColor: 'rgba(145,70,255,0.25)',
    advance: () => ({ has_video: true, status: 'HAZIR' as ContentStatus }),
    advanceLabel: 'Video Hazır →',
  },
  {
    id: 'HAZIR',
    label: 'Hazır',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.07)',
    borderColor: 'rgba(34,197,94,0.25)',
    advance: () => ({ status: 'YAYINLANDI' as ContentStatus }),
    advanceLabel: 'Yayınlandı ✓',
  },
  {
    id: 'YAYINLANDI',
    label: 'Yayınlandı',
    color: '#6B6B6B',
    bg: 'rgba(107,107,107,0.05)',
    borderColor: 'rgba(107,107,107,0.2)',
    advance: () => null,
    advanceLabel: '',
  },
];

function getStage(item: ContentQueueItem): Stage {
  if (item.status === 'YAYINLANDI') return 'YAYINLANDI';
  if (item.has_video)              return 'HAZIR';
  if (item.has_voice)              return 'EDITOR';
  if (item.has_text)               return 'SES';
  return 'METIN';
}

// ── Card ───────────────────────────────────────────────────────────────────────

interface CardProps {
  item: ContentQueueItem;
  stage: StageConfig;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
  onAdvance: (link?: string, assigneeId?: string) => void;
  onAssign: (personId: string | null) => void;
  canEdit: boolean;
  handoffStages: string[];
  voicePeople: Person[];
}

function ProductionProgress({ item }: { item: ContentQueueItem }) {
  const steps = [
    { done: item.has_text,  label: 'Metin' },
    { done: item.has_voice, label: 'Ses'   },
    { done: item.has_video, label: 'Video' },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map(({ done, label }) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: done ? 'var(--color-success)' : 'var(--color-border)' }}
          />
          <span
            className="text-[9px] font-medium"
            style={{ color: done ? 'var(--color-success)' : 'var(--color-text-muted)' }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ item, stage, onEdit, onDelete, isPending, onAdvance, onAssign, canEdit, handoffStages, voicePeople }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [voiceLink, setVoiceLink] = useState(item.voice_url || '');
  const [videoLink, setVideoLink] = useState(item.video_url || '');
  const [assignee, setAssignee] = useState('');
  const hasDetails = Boolean(item.content_text || item.voice_url || item.video_url);
  const assigneeName = voicePeople.find((p) => p.id === item.assigned_to)?.name;

  const base = stage.advance(item);
  // Full editors advance anything; stage owners advance only their own stage.
  const canAdvanceThis = canEdit || handoffStages.includes(stage.id);
  // Advancing "Metin Tamam" requires choosing who voices it.
  const needsAssignee = stage.id === 'METIN';
  const advanceDisabled = isPending || (needsAssignee && !assignee);
  function handleAdvanceClick() {
    if (!base) return;
    if (stage.id === 'METIN')  return onAdvance(undefined, assignee);
    if (stage.id === 'SES')    return onAdvance(voiceLink.trim());
    if (stage.id === 'EDITOR') return onAdvance(videoLink.trim());
    onAdvance();
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)]"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Accent strip by stage */}
      <div className="h-1 w-full" style={{ backgroundColor: stage.color }} />

      <div className="p-3">
        {/* Platform badges + format */}
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {item.platforms.map((p: ContentPlatform) => {
            const c = PLATFORM_COLORS[p];
            return (
              <span
                key={p}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: c.bg, color: c.color }}
              >
                {PLATFORM_LABELS[p]}
              </span>
            );
          })}
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-sunken)' }}
          >
            {item.content_type}
          </span>
        </div>

        {/* Title */}
        <p
          className="mb-2 text-sm font-semibold leading-snug"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {item.title}
        </p>

        {/* Text snippet (always visible so card isn't empty) */}
        {item.content_text && !expanded && (
          <p
            className="mb-2.5 line-clamp-2 text-[11px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {item.content_text}
          </p>
        )}

        {/* Production progress bar */}
        <div className="mb-2.5">
          <ProductionProgress item={item} />
        </div>

        {/* Meta row: date */}
        {item.planned_date && (
          <div className="mb-2.5 flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(item.planned_date)}
          </div>
        )}

        {/* Expand: FULL content text + links */}
        {hasDetails && (
          <div className="mb-2.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}
            >
              <ChevronRight
                className="h-3 w-3 transition-transform"
                style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
              />
              {expanded ? 'Gizle' : 'Tam metni gör'}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {item.content_text && (
                  <div
                    className="rounded-[var(--radius-sm)] p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      backgroundColor: 'var(--color-surface-sunken)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {item.content_text}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {item.voice_url && (
                    <a
                      href={item.voice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                      style={{ backgroundColor: 'var(--color-info-muted)', color: 'var(--color-info)' }}
                    >
                      🎙 Ses <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {item.video_url && (
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                      style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}
                    >
                      🎬 Video <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metin → Ses: pick who voices it */}
        {canAdvanceThis && stage.id === 'METIN' && (
          <div className="mb-2.5">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] outline-none"
              style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="">🎙 Seslendirecek kişiyi seç…</option>
              {voicePeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Assigned voice person — editable by Admin/Yayıncı, badge for others */}
        {stage.id === 'SES' && (
          canEdit ? (
            <div className="mb-2.5">
              <select
                value={item.assigned_to ?? ''}
                onChange={(e) => onAssign(e.target.value || null)}
                disabled={isPending}
                className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-medium outline-none disabled:opacity-60"
                style={{
                  backgroundColor: item.assigned_to ? 'var(--color-accent-muted)' : 'var(--color-surface-sunken)',
                  border: `1px solid ${item.assigned_to ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: item.assigned_to ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}
              >
                <option value="">👤 Seslendiren ata…</option>
                {voicePeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : assigneeName ? (
            <div className="mb-2.5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                👤 {assigneeName}
              </span>
            </div>
          ) : null
        )}

        {/* Stage handoff input */}
        {canAdvanceThis && stage.id === 'SES' && (
          <div className="mb-2.5">
            <input
              value={voiceLink}
              onChange={(e) => setVoiceLink(e.target.value)}
              placeholder="🎙 Ses linkini yapıştır"
              type="url"
              className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] outline-none"
              style={{
                backgroundColor: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        )}
        {canAdvanceThis && stage.id === 'EDITOR' && (
          <div className="mb-2.5 space-y-1.5">
            {item.voice_url && (
              <a
                href={item.voice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'var(--color-info-muted)', color: 'var(--color-info)' }}
              >
                🎙 Sesi aç <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            <input
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="🎬 Video/edit linkini yapıştır"
              type="url"
              className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] outline-none"
              style={{
                backgroundColor: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        )}

        {/* Actions — advance for the stage owner; edit/delete for full editors */}
        {(canEdit || (canAdvanceThis && base)) && (
          <div className="flex items-center gap-1.5 border-t pt-2.5" style={{ borderColor: 'var(--color-border)' }}>
            {base && canAdvanceThis && (
              <button
                onClick={handleAdvanceClick}
                disabled={advanceDisabled}
                className="flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: stage.color, color: '#fff' }}
              >
                {stage.advanceLabel}
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  className="rounded p-1.5 transition-colors hover:bg-black/5"
                  title="Düzenle"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onDelete}
                  className="rounded p-1.5 transition-colors hover:bg-red-500/10"
                  title="Sil"
                  style={{ color: 'var(--color-error)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────────

interface ColumnProps {
  stage: StageConfig;
  items: ContentQueueItem[];
  onEdit: (item: ContentQueueItem) => void;
  onDelete: (id: string) => void;
  onAdvance: (item: ContentQueueItem, link?: string, assigneeId?: string) => void;
  onAssign: (item: ContentQueueItem, personId: string | null) => void;
  isPending: boolean;
  canEdit: boolean;
  handoffStages: string[];
  voicePeople: Person[];
}

function KanbanColumn({ stage, items, onEdit, onDelete, onAdvance, onAssign, isPending, canEdit, handoffStages, voicePeople }: ColumnProps) {
  return (
    <div className="flex w-full flex-col md:min-w-[220px] md:flex-1">
      {/* Column header */}
      <div
        className="mb-3 flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2"
        style={{ backgroundColor: stage.bg, border: `1px solid ${stage.borderColor}` }}
      >
        <span className="text-xs font-semibold" style={{ color: stage.color }}>
          {stage.label}
        </span>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ backgroundColor: stage.color, color: '#fff' }}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {items.length === 0 && (
          <div
            className="rounded-[var(--radius-sm)] px-3 py-5 text-center text-xs"
            style={{ color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}
          >
            Boş
          </div>
        )}
        {items.map((item) => {
          return (
            <KanbanCard
              key={item.id}
              item={item}
              stage={stage}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
              onAdvance={(link, assigneeId) => onAdvance(item, link, assigneeId)}
              onAssign={(personId) => onAssign(item, personId)}
              isPending={isPending}
              canEdit={canEdit}
              handoffStages={handoffStages}
              voicePeople={voicePeople}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
}

interface Person { id: string; name: string }

interface ContentKanbanProps {
  items: ContentQueueItem[];
  canEdit?: boolean;
  /** Pipeline stages this user may hand off (advance) even without full edit. */
  handoffStages?: string[];
  /** People who can be assigned to voice a card (Seslendirmen + Yayıncı). */
  voicePeople?: Person[];
}

export function ContentKanban({ items, canEdit = true, handoffStages = [], voicePeople = [] }: ContentKanbanProps) {
  const [isPending, startTransition] = useTransition();
  const [editItem,  setEditItem]  = useState<ContentQueueItem | null>(null);
  const [formOpen,  setFormOpen]  = useState(false);

  function openAdd() { setEditItem(null); setFormOpen(true); }
  function openEdit(item: ContentQueueItem) { setEditItem(item); setFormOpen(true); }

  function handleAdvance(item: ContentQueueItem, link?: string, assigneeId?: string) {
    startTransition(async () => { await advanceContentStage(item.id, link ?? null, assigneeId ?? null); });
  }

  function handleAssign(item: ContentQueueItem, personId: string | null) {
    startTransition(async () => { await assignContentPerson(item.id, personId); });
  }

  function handleDelete(id: string) {
    if (!confirm('Bu içeriği silmek istediğine emin misin?')) return;
    startTransition(async () => { await deleteContentItem(id); });
  }

  const grouped = Object.fromEntries(
    STAGES.map((s) => [s.id, items.filter((i) => getStage(i) === s.id)])
  ) as Record<Stage, ContentQueueItem[]>;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {items.length} içerik{canEdit ? ' · Aşamayı ilerletmek için kart butonuna bas' : ' · salt görüntüleme'}
        </p>
        {canEdit && (
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni İçerik
          </Button>
        )}
      </div>

      {/* Board — stacked stages on phones, side-by-side columns from md up */}
      <div className="flex flex-col gap-5 pb-4 md:flex-row md:gap-3 md:overflow-x-auto">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            items={grouped[stage.id] || []}
            onEdit={openEdit}
            onDelete={handleDelete}
            onAdvance={handleAdvance}
            onAssign={handleAssign}
            isPending={isPending}
            canEdit={canEdit}
            handoffStages={handoffStages}
            voicePeople={voicePeople}
          />
        ))}
      </div>

      {canEdit && (
        <ContentForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          item={editItem}
        />
      )}
    </div>
  );
}
