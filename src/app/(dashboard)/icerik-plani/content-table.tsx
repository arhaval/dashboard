'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronRight, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STAGE_ADVANCE_LABELS,
  STAGE_LABELS_MAP,
  STAGE_ORDER,
  STAGE_STYLES,
  canAdvanceStage,
  daysWaiting,
  deriveStage,
  isOverdue,
  stageRequirement,
  staleLevel,
  type ContentPlatform,
  type ContentQueueItem,
  type ContentStage,
} from './content-queue.constants';
import { advanceContentStage, assignContentPerson, deleteContentItem } from './queue-actions';
import { ContentForm } from './content-form';
import { ScriptReader } from './script-reader';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * İşin ne kadar süredir hareketsiz olduğu. Takip merkezinin asıl sinyali:
 * aşama kimde beklediğini, bu ne kadar beklediğini söyler.
 */
function WaitingCell({ item, stage }: { item: ContentQueueItem; stage: ContentStage }) {
  if (stage === 'YAYINLANDI') {
    return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>;
  }
  const days = daysWaiting(item.updated_at);
  if (days === null) {
    return <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>;
  }
  const level = staleLevel(days);
  const color =
    level === 'LATE' ? 'var(--color-error)'
    : level === 'WARN' ? 'var(--color-warning)'
    : 'var(--color-text-muted)';
  return (
    <span
      className="text-xs"
      style={{ color, fontWeight: level === 'OK' ? 400 : 600 }}
      title={`Son hareket: ${new Date(item.updated_at).toLocaleDateString('tr-TR')}`}
    >
      {days === 0 ? 'bugün' : `${days} gün`}
    </span>
  );
}

interface ContentTableProps {
  items: ContentQueueItem[];
  canEdit: boolean;
  /** Bu kullanıcının teslim edebileceği aşamalar (rolünden gelir). */
  handoffStages: string[];
  voicePeople: { id: string; name: string }[];
  /** Oturumdaki kişi — seslendirmen yalnızca KENDİ işine link bırakabilsin. */
  currentUserId: string;
}

/**
 * Liste görünümü: hangi iş kimde ve hangi adımda bekliyor.
 *
 * Pano işin akışını gösteriyor ama tamamı tek ekrana sığmıyor ve "neler
 * yapılmadı" sorusu kolonlar arasında geziniyor. Liste bunu bir tabloya
 * indirir: her satır bir içerik, aşaması, beklediği kişi ve üç adımın durumu.
 * Satır açıldığında metin okunur ve o aşamanın işi (link yapıştırma, kişi
 * atama) aynı yerde yapılır — panodaki eylemlerin aynısı, aynı sunucu
 * eylemleriyle.
 */
export function ContentTable({
  items,
  canEdit,
  handoffStages,
  voicePeople,
  currentUserId,
}: ContentTableProps) {
  const [stageFilter, setStageFilter] = useState<ContentStage | 'TUMU'>('TUMU');
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | 'TUMU'>('TUMU');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ContentQueueItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const nameById = useMemo(
    () => new Map(voicePeople.map((p) => [p.id, p.name])),
    [voicePeople]
  );

  const withStage = useMemo(
    () => items.map((item) => ({ item, stage: deriveStage(item) })),
    [items]
  );

  /** Aşama başına iş sayısı — üstteki şerit hem özet hem filtre. */
  const counts = useMemo(() => {
    const acc = new Map<ContentStage, number>(STAGE_ORDER.map((s) => [s, 0]));
    for (const { stage } of withStage) acc.set(stage, (acc.get(stage) ?? 0) + 1);
    return acc;
  }, [withStage]);

  const rows = useMemo(() => {
    const filtered = withStage.filter(({ item, stage }) => {
      if (stageFilter !== 'TUMU' && stage !== stageFilter) return false;
      if (platformFilter !== 'TUMU' && !item.platforms.includes(platformFilter)) return false;
      return true;
    });
    // Tarihe göre: en yakın yayın günü üstte. Tarihi olmayan kartlar en altta
    // (sıralanacak bir günleri yok, listenin başını kapatmasınlar).
    return filtered.sort((a, b) => {
      const byDate = (a.item.planned_date ?? '9999-99-99').localeCompare(
        b.item.planned_date ?? '9999-99-99'
      );
      if (byDate !== 0) return byDate;
      return STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    });
  }, [withStage, stageFilter, platformFilter]);

  function handleDelete(id: string) {
    if (!confirm('Bu içeriği silmek istediğine emin misin?')) return;
    startTransition(async () => { await deleteContentItem(id); });
  }

  const headers = ['İçerik', 'Aşama', 'Bekleyen', 'Bekleme', 'Tarih', ''];

  return (
    <div>
      {/* Özet şeridi: kaç iş hangi aşamada. Tıklanınca filtreler. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStageFilter('TUMU')}
          className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors"
          style={
            stageFilter === 'TUMU'
              ? { backgroundColor: 'var(--color-accent)', color: '#fff' }
              : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
          }
        >
          Tümü {items.length}
        </button>
        {STAGE_ORDER.map((stage) => {
          const n = counts.get(stage) ?? 0;
          const active = stageFilter === stage;
          const style = STAGE_STYLES[stage];
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(active ? 'TUMU' : stage)}
              disabled={n === 0}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                backgroundColor: active ? style.color : style.bg,
                color: active ? '#fff' : style.color,
                border: `1px solid ${active ? style.color : style.borderColor}`,
              }}
            >
              {STAGE_LABELS_MAP[stage]} {n}
            </button>
          );
        })}

        {canEdit && (
          <div className="ml-auto">
            <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Yeni İçerik
            </Button>
          </div>
        )}
      </div>

      {/* Platform filtresi */}
      <div className="mb-4 flex flex-wrap gap-1">
        {(['TUMU', ...Object.keys(PLATFORM_LABELS)] as (ContentPlatform | 'TUMU')[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={
              platformFilter === p
                ? { backgroundColor: 'var(--color-surface-sunken)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-hover)' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            {p === 'TUMU' ? 'Tüm platformlar' : PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-[var(--radius-md)] p-10 text-center"
          style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {items.length === 0
              ? 'Henüz içerik yok. "Yeni İçerik" ile metni yaz ve seslendirmene gönder.'
              : 'Bu filtreyle eşleşen içerik yok.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)]" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                {headers.map((h) => (
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
              {rows.map(({ item, stage }, idx) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  stage={stage}
                  zebra={idx % 2 === 0}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                  assigneeName={item.assigned_to ? nameById.get(item.assigned_to) ?? null : null}
                  canEdit={canEdit}
                  canHandoff={handoffStages.includes(stage)}
                  currentUserId={currentUserId}
                  voicePeople={voicePeople}
                  isPending={isPending}
                  onEdit={() => { setEditItem(item); setFormOpen(true); }}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <ContentForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          item={editItem}
          voicePeople={voicePeople}
        />
      )}

    </div>
  );
}

// ── Satır ────────────────────────────────────────────────────────────────────

interface ContentRowProps {
  item: ContentQueueItem;
  stage: ContentStage;
  zebra: boolean;
  expanded: boolean;
  onToggle: () => void;
  assigneeName: string | null;
  canEdit: boolean;
  canHandoff: boolean;
  currentUserId: string;
  voicePeople: { id: string; name: string }[];
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ContentRow({
  item,
  stage,
  zebra,
  expanded,
  onToggle,
  assigneeName,
  canEdit,
  canHandoff,
  currentUserId,
  voicePeople,
  isPending,
  onEdit,
  onDelete,
}: ContentRowProps) {
  const [link, setLink] = useState('');
  const [busy, startTransition] = useTransition();

  const style = STAGE_STYLES[stage];
  const requirement = stageRequirement(stage);
  const overdue = isOverdue(item.planned_date, stage, new Date().toISOString().slice(0, 10));
  // Tam yetkili (Admin/Yayıncı/Youtuber) her aşamayı ilerletir. Diğerleri
  // yalnızca kendi rolünün aşamasını; Ses'te ek olarak işin KENDİSİNE atanmış
  // olması gerekir. Sunucu da aynı kuralı uyguluyor (advanceContentStage);
  // burada kutuyu hiç göstermemek, reddedilecek bir işi teklif etmemek için.
  const ownsStage = stage === 'SES' ? item.assigned_to === currentUserId : true;
  const mayAdvance = canAdvanceStage(stage) && (canEdit || (canHandoff && ownsStage));
  const published = stage === 'YAYINLANDI';

  function advance(assigneeId?: string) {
    startTransition(async () => {
      await advanceContentStage(item.id, link.trim() || null, assigneeId);
      setLink('');
    });
  }

  function assign(personId: string | null) {
    startTransition(async () => { await assignContentPerson(item.id, personId); });
  }

  const pending = isPending || busy;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition-colors"
        style={{
          backgroundColor: expanded
            ? 'var(--color-surface-2)'
            : zebra ? 'var(--color-surface-1)' : 'var(--color-surface-2)',
          borderBottom: expanded ? 'none' : '1px solid var(--color-border)',
          opacity: published ? 0.6 : 1,
        }}
      >
        {/* İçerik: başlık + platform/format */}
        <td className="px-4 py-3" style={{ maxWidth: 320 }}>
          <div className="flex items-start gap-1.5">
            <ChevronRight
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-transform"
              style={{ color: 'var(--color-text-muted)', transform: expanded ? 'rotate(90deg)' : 'none' }}
            />
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {item.platforms.map((p) => {
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
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {item.content_type}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* Aşama */}
        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: style.bg, color: style.color, border: `1px solid ${style.borderColor}` }}
          >
            {STAGE_LABELS_MAP[stage]}
          </span>
        </td>

        {/* Bekleyen kişi */}
        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
          {assigneeName ? (
            <span className="text-xs">{assigneeName}</span>
          ) : stage === 'EDITOR' ? (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Editör</span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
          )}
        </td>

        {/* Bekleme: kac gundur hareketsiz */}
        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
          <WaitingCell item={item} stage={stage} />
        </td>

        {/* Planlanan yayin tarihi — gecmisse kirmizi */}
        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
          <span
            className="text-xs"
            style={{
              color: overdue ? 'var(--color-error)' : 'var(--color-text-muted)',
              fontWeight: overdue ? 600 : 400,
            }}
            title={overdue ? 'Planlanan gün geçti, hâlâ yayınlanmadı' : undefined}
          >
            {formatDate(item.planned_date)}
          </span>
        </td>

        {/* Eylem */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
          <div className="flex items-center justify-end gap-1">
            {canEdit && (
              <>
                <button
                  onClick={onEdit}
                  title="Düzenle"
                  className="rounded p-1.5 transition-colors hover:bg-black/5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onDelete}
                  disabled={pending}
                  title="Sil"
                  className="rounded p-1.5 transition-colors hover:bg-red-500/10"
                  style={{ color: 'var(--color-error)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
          <td colSpan={6} className="px-4 pb-4 pt-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                {item.content_text ? (
                  <ScriptReader text={item.content_text} />
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Bu kartta metin yok.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {(item.voice_url || item.video_url) && (
                  <div className="flex flex-wrap gap-2">
                    {item.voice_url && (
                      <a
                        href={item.voice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-info-muted)', color: 'var(--color-info)' }}
                      >
                        🎙 Ses <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item.video_url && (
                      <a
                        href={item.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-success-muted)', color: 'var(--color-success)' }}
                      >
                        🎬 Video <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Metin aşaması: seslendireni seç ve teslim et */}
                {requirement === 'ASSIGNEE' && mayAdvance && (
                  <div className="space-y-2">
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Seslendirecek kişiyi seç — kart ona gider ve bildirim alır.
                    </p>
                    <select
                      defaultValue=""
                      disabled={pending}
                      onChange={(e) => { if (e.target.value) advance(e.target.value); }}
                      className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-xs outline-none"
                      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    >
                      <option value="">🎙 Seslendirecek kişiyi seç…</option>
                      {voicePeople.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ses / Kurgu aşaması: linki bırak ve ilerlet */}
                {requirement === 'LINK' && mayAdvance && (
                  <div className="space-y-2">
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      type="url"
                      placeholder={stage === 'SES' ? '🎙 Ses linkini yapıştır' : '🎬 Video linkini yapıştır'}
                      className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-xs outline-none"
                      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    />
                    <button
                      onClick={() => advance()}
                      disabled={pending}
                      className="w-full rounded-[var(--radius-sm)] py-1.5 text-[11px] font-semibold disabled:opacity-50"
                      style={{ backgroundColor: style.color, color: '#fff' }}
                    >
                      {STAGE_ADVANCE_LABELS[stage]}
                    </button>
                  </div>
                )}

                {/* Ses aşamasında atamayı düzeltmek: yanlış kişiye gittiyse */}
                {stage === 'SES' && canEdit && (
                  <select
                    value={item.assigned_to ?? ''}
                    disabled={pending}
                    onChange={(e) => assign(e.target.value || null)}
                    className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">👤 Seslendiren ata…</option>
                    {voicePeople.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {item.notes && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
