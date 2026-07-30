'use client';

/**
 * İÇERİK BAZLI görünüm — her satır tek bir ana üretim (content_queue kartı),
 * bütün platformlardaki sonuçları birleşmiş halde.
 *
 * Filtreleme, sıralama ve sayfalama SUNUCUDA yapılır: bu component yalnızca
 * sorguyu kurar ve dönen sayfayı gösterir. Bütün korpus tarayıcıya inmez.
 *
 * Ana listede yalnızca KARAR VERMEK için gereken metrikler var (erişim,
 * etkileşim, platformlar, en güçlü platform, genel durum). Diğer bütün
 * toplamlar ve platform kırılımı detay drawer'ında.
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Layers, Search, TrendingUp, X } from 'lucide-react';
import { ContentImpactDrawer } from './content-impact-drawer';
import { fetchContentImpactPage } from './content-impact-actions';
import {
  ALL,
  DEFAULT_IMPACT_QUERY,
  LIBRARY_LABELS,
  OVERALL_STATUS_META,
  REACH_LABELS,
  SORT_LABELS,
  SORT_OPTIONS,
  fmtCompact,
  fmtDate,
  fmtInt,
  fmtRatio,
  type ContentImpact,
  type ContentImpactPage,
  type ContentImpactQuery,
  type ContentImpactSort,
  type LibraryFilter,
  type OverallStatus,
  type PlatformReach,
} from './content-impact.constants';
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PUBLISH_PLATFORMS,
  type ContentPlatform,
} from '../icerik-plani/content-queue.constants';

interface Props {
  /** Sunucuda hazırlanmış ilk sayfa (sorgusuyla birlikte). */
  initialPage: ContentImpactPage;
}

export function ContentImpactView({ initialPage }: Props) {
  const [data, setData] = useState<ContentImpactPage>(initialPage);
  const [query, setQuery] = useState<ContentImpactQuery>(initialPage.query);
  const [searchText, setSearchText] = useState(initialPage.query.search);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  // Telefonda tablo okunmaz — kart listesi CSS ile zorunlu. Bu seçim yalnızca
  // masaüstünü etkiler.
  const [desktopView, setDesktopView] = useState<'table' | 'card'>('table');

  // İlk sayfa sunucudan geldi; aynı sorguyu tekrar çalıştırmıyoruz.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const res = await fetchContentImpactPage(query);
      if (cancelled) return;
      if (res.page) {
        setError(null);
        setData(res.page);
      } else {
        setError(res.error ?? 'Liste yenilenemedi');
      }
    });
    return () => { cancelled = true; };
  }, [query]);

  // Arama her tuşta sunucuya gitmesin.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchText.trim();
      setQuery((q) => (q.search === next ? q : { ...q, search: next, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchText]);

  /** Filtre değişimi her zaman ilk sayfaya döner (aksi halde boş sayfa görünür). */
  function patch(p: Partial<ContentImpactQuery>) {
    setQuery((q) => ({ ...q, ...p, page: p.page ?? 1 }));
  }

  function togglePlatform(p: ContentPlatform) {
    patch({
      platforms: query.platforms.includes(p)
        ? query.platforms.filter((x) => x !== p)
        : [...query.platforms, p],
    });
  }

  /** Tarih sütunu iki yönlüdür; diğer sütunlar tek yönlü (büyükten küçüğe). */
  function toggleSort(sort: ContentImpactSort) {
    if (sort === 'NEWEST') patch({ sort: query.sort === 'NEWEST' ? 'OLDEST' : 'NEWEST' });
    else patch({ sort });
  }

  const dirty =
    query.search !== '' ||
    query.from !== null ||
    query.to !== null ||
    query.contentType !== ALL ||
    query.platforms.length > 0 ||
    query.reach !== 'ALL' ||
    query.status !== ALL ||
    query.library !== 'ALL';

  function reset() {
    setSearchText('');
    setQuery({ ...DEFAULT_IMPACT_QUERY, sort: query.sort, pageSize: query.pageSize });
  }

  const open = openId ? data.items.find((i) => i.cardId === openId) ?? null : null;
  const unlinkedTotal = data.unlinked.youtube + data.unlinked.instagram;

  return (
    <div>
      <FilterBar
        query={query}
        facets={data.facets}
        searchText={searchText}
        onSearch={setSearchText}
        onPatch={patch}
        onTogglePlatform={togglePlatform}
        desktopView={desktopView}
        onToggleView={() => setDesktopView((v) => (v === 'table' ? 'card' : 'table'))}
        dirty={dirty}
        onReset={reset}
      />

      {error && (
        <p className="mb-3 text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>
      )}

      <div style={{ opacity: pending ? 0.55 : 1, transition: 'opacity 120ms' }}>
        {data.items.length === 0 ? (
          <div
            className="rounded-[var(--radius-md)] p-10 text-center"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {data.grandTotal === 0
                ? 'Henüz platform yayın kaydı olan içerik yok. İçerik Planı’nda bir kartı “Yayınla” ile platformlara bağla — birleşik performans burada oluşur.'
                : 'Bu filtreyle eşleşen içerik yok.'}
            </p>
          </div>
        ) : (
          <>
            {/* Telefon: her zaman kart */}
            <div className="md:hidden">
              <CardList impacts={data.items} onOpen={setOpenId} />
            </div>
            {/* Masaüstü: seçilen görünüm */}
            <div className="hidden md:block">
              {desktopView === 'table' ? (
                <TableList impacts={data.items} sort={query.sort} toggleSort={toggleSort} onOpen={setOpenId} />
              ) : (
                <CardList impacts={data.items} onOpen={setOpenId} />
              )}
            </div>

            <Pagination page={data} onPage={(p) => patch({ page: p })} disabled={pending} />
          </>
        )}
      </div>

      {unlinkedTotal > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {fmtInt(data.unlinked.youtube)} YouTube videosu ve {fmtInt(data.unlinked.instagram)} Instagram gönderisi hiçbir
          içerik kartına bağlı değil, bu yüzden burada görünmüyor — yanlış içerikle otomatik eşleştirilmiyorlar. Hepsi
          Platform Bazlı görünümde. Bağlamak için İçerik Planı’ndaki kartın yayın bilgilerine linki gir.
        </p>
      )}

      {open && <ContentImpactDrawer impact={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ── Filtre çubuğu ────────────────────────────────────────────────────────────

function FilterBar({
  query,
  facets,
  searchText,
  onSearch,
  onPatch,
  onTogglePlatform,
  desktopView,
  onToggleView,
  dirty,
  onReset,
}: {
  query: ContentImpactQuery;
  facets: ContentImpactPage['facets'];
  searchText: string;
  onSearch: (v: string) => void;
  onPatch: (p: Partial<ContentImpactQuery>) => void;
  onTogglePlatform: (p: ContentPlatform) => void;
  desktopView: 'table' | 'card';
  onToggleView: () => void;
  dirty: boolean;
  onReset: () => void;
}) {
  const platformCount = new Map(facets.platforms.map((f) => [f.platform, f.count]));
  const statusCount = new Map(facets.statuses.map((f) => [f.status, f.count]));

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={searchText}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Başlık veya #kod ara"
            className="w-56 rounded-[var(--radius-md)] py-1.5 pl-7 pr-2 text-xs outline-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
          />
        </div>

        <Select value={query.contentType} onChange={(v) => onPatch({ contentType: v })} label="İçerik türü">
          <option value={ALL}>Tüm türler</option>
          {facets.contentTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.value} ({t.count})</option>
          ))}
        </Select>

        <Select value={query.status} onChange={(v) => onPatch({ status: v as OverallStatus | typeof ALL })} label="Genel durum">
          <option value={ALL}>Tüm durumlar</option>
          {facets.statuses.map((s) => (
            <option key={s.status} value={s.status}>
              {OVERALL_STATUS_META[s.status].text} ({statusCount.get(s.status) ?? 0})
            </option>
          ))}
        </Select>

        <Select value={query.reach} onChange={(v) => onPatch({ reach: v as PlatformReach })} label="Platform sayısı">
          {(Object.keys(REACH_LABELS) as PlatformReach[]).map((r) => (
            <option key={r} value={r}>{REACH_LABELS[r]}</option>
          ))}
        </Select>

        <Select value={query.library} onChange={(v) => onPatch({ library: v as LibraryFilter })} label="Kütüphane">
          {(Object.keys(LIBRARY_LABELS) as LibraryFilter[]).map((l) => (
            <option key={l} value={l}>{LIBRARY_LABELS[l]}</option>
          ))}
        </Select>

        <Select value={query.sort} onChange={(v) => onPatch({ sort: v as ContentImpactSort })} label="Sıralama">
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </Select>

        <button
          onClick={onToggleView}
          className="hidden items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors md:inline-flex"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          <Layers className="h-3.5 w-3.5" />
          {desktopView === 'table' ? 'Kart' : 'Tablo'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Platformlar:</span>
        {PUBLISH_PLATFORMS.map((p) => {
          const active = query.platforms.includes(p.value);
          const c = PLATFORM_COLORS[p.value];
          return (
            <button
              key={p.value}
              onClick={() => onTogglePlatform(p.value)}
              className="rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors"
              style={
                active
                  ? { backgroundColor: c.bg, color: c.color, border: `1px solid ${c.color}` }
                  : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
              title={`${p.label} — yalnızca bu platformda yayınlananlar`}
            >
              {p.label} ({platformCount.get(p.value) ?? 0})
            </button>
          );
        })}

        <span className="ml-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>İlk yayın:</span>
        <DateInput value={query.from} onChange={(v) => onPatch({ from: v })} label="Başlangıç" />
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>–</span>
        <DateInput value={query.to} onChange={(v) => onPatch({ to: v })} label="Bitiş" />

        {dirty && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <X className="h-3 w-3" /> Filtreleri temizle
          </button>
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, label, children }: {
  value: string; onChange: (v: string) => void; label: string; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      title={label}
      className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold outline-none"
      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
    >
      {children}
    </select>
  );
}

function DateInput({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <input
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={label}
      title={label}
      className="rounded-[var(--radius-md)] px-2 py-1 text-[11px] outline-none"
      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
    />
  );
}

// ── Sayfalama ────────────────────────────────────────────────────────────────

function Pagination({ page, onPage, disabled }: {
  page: ContentImpactPage; onPage: (p: number) => void; disabled: boolean;
}) {
  const first = page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1;
  const last = Math.min(page.page * page.pageSize, page.total);

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-xs"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
    >
      <span>
        <b style={{ color: 'var(--color-text-primary)' }}>{first}–{last}</b> / {page.total}
        {page.total !== page.grandTotal && <span style={{ color: 'var(--color-text-muted)' }}> (toplam {page.grandTotal})</span>}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <PageButton disabled={disabled || page.page <= 1} onClick={() => onPage(page.page - 1)} label="Önceki">
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageButton>
        <span className="font-mono text-[11px]">{page.page} / {page.pageCount}</span>
        <PageButton disabled={disabled || page.page >= page.pageCount} onClick={() => onPage(page.page + 1)} label="Sonraki">
          <ChevronRight className="h-3.5 w-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ disabled, onClick, label, children }: {
  disabled: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-[var(--radius-sm)] p-1 disabled:opacity-35"
      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
    >
      {children}
    </button>
  );
}

// ── Ortak parçalar ───────────────────────────────────────────────────────────

function PlatformBadges({ impact }: { impact: ContentImpact }) {
  const publishedOn = new Set(impact.publications.map((p) => p.platform));
  const missing = impact.plannedPlatforms.filter((p) => !publishedOn.has(p));
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {impact.publications.map((p) => {
        const c = PLATFORM_COLORS[p.platform];
        return (
          <span
            key={p.platform}
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: c.bg, color: c.color }}
            title={PLATFORM_LABELS[p.platform]}
          >
            {PLATFORM_LABELS[p.platform]}
          </span>
        );
      })}
      {missing.map((p) => (
        <span
          key={p}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}
          title={`${PLATFORM_LABELS[p]} planlandı ama yayın kaydı yok`}
        >
          {PLATFORM_LABELS[p]}?
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ impact }: { impact: ContentImpact }) {
  const meta = OVERALL_STATUS_META[impact.verdict.status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}
      title={impact.verdict.note}
    >
      {meta.text}
    </span>
  );
}

function StrongestCell({ impact }: { impact: ContentImpact }) {
  const s = impact.comparison.strongest;
  if (!s) return <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const c = PLATFORM_COLORS[s.platform];
  return (
    <span className="inline-flex items-center gap-1.5" title={s.explanation}>
      <TrendingUp className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
      <span className="text-[11.5px] font-semibold" style={{ color: c.color }}>{PLATFORM_LABELS[s.platform]}</span>
      <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{fmtRatio(s.score)}x</span>
    </span>
  );
}

/** Toplam + veri kapsamı — eksik kapsam sessizce gizlenmez. */
function TotalCell({ value, available, total }: { value: number | null; available: number; total: number }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-mono text-[12.5px]" style={{ color: value == null ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
        {value == null ? '—' : fmtInt(value)}
      </span>
      {value != null && available < total && (
        <span className="text-[10px]" style={{ color: 'var(--color-warning)' }} title="Bazı platformların verisi yok">
          {available}/{total}
        </span>
      )}
    </span>
  );
}

// ── Tablo görünümü ───────────────────────────────────────────────────────────

function SortHeader({ label, active, dir, onClick, align }: {
  label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; align?: 'right';
}) {
  const Chev = dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th
      onClick={onClick}
      className="cursor-pointer select-none px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider"
      style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)', textAlign: align ?? 'left', whiteSpace: 'nowrap' }}
    >
      <span className="inline-flex items-center gap-1" style={{ flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {label} <Chev className="h-3 w-3" style={{ opacity: active ? 1 : 0.35 }} />
      </span>
    </th>
  );
}

function TableList({ impacts, sort, toggleSort, onOpen }: {
  impacts: ContentImpact[];
  sort: ContentImpactSort;
  toggleSort: (s: ContentImpactSort) => void;
  onOpen: (id: string) => void;
}) {
  const dateActive = sort === 'NEWEST' || sort === 'OLDEST';
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 980 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ width: 74 }} />
              <th className="px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                İçerik
              </th>
              <SortHeader label="Platformlar" active={sort === 'PLATFORMS'} dir="desc" onClick={() => toggleSort('PLATFORMS')} />
              <SortHeader label="Toplam Erişim" active={sort === 'EXPOSURE'} dir="desc" onClick={() => toggleSort('EXPOSURE')} align="right" />
              <SortHeader label="Toplam Etkileşim" active={sort === 'ENGAGEMENT'} dir="desc" onClick={() => toggleSort('ENGAGEMENT')} align="right" />
              <th className="px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                En Güçlü
              </th>
              <SortHeader label="Genel Durum" active={sort === 'STATUS'} dir="desc" onClick={() => toggleSort('STATUS')} />
              <SortHeader label="İlk Yayın" active={dateActive} dir={sort === 'OLDEST' ? 'asc' : 'desc'} onClick={() => toggleSort('NEWEST')} align="right" />
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {impacts.map((i, idx) => (
              <tr
                key={i.cardId}
                onClick={() => onOpen(i.cardId)}
                className="cursor-pointer"
                style={{
                  backgroundColor: idx % 2 ? 'var(--color-table-row-even)' : 'var(--color-table-row-odd)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <td className="py-2 pl-3.5">
                  {i.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.thumbnail} alt="" loading="lazy" className="h-[34px] w-[60px] rounded-[var(--radius-sm)] object-cover" />
                  ) : (
                    <div className="h-[34px] w-[60px] rounded-[var(--radius-sm)]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                  )}
                </td>
                <td className="px-3.5 py-2">
                  <p className="max-w-[300px] truncate text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{i.title}</p>
                  <span className="flex items-center gap-1.5">
                    <code className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>#{i.code}</code>
                    {i.contentType && (
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {i.contentType}</span>
                    )}
                    {i.inLibrary && (
                      <span className="text-[10px]" style={{ color: 'var(--color-info)' }} title="Metni kütüphanede">· metin var</span>
                    )}
                  </span>
                </td>
                <td className="px-3.5 py-2"><PlatformBadges impact={i} /></td>
                <td className="px-3.5 py-2 text-right">
                  <TotalCell value={i.totals.exposure.value} available={i.totals.exposure.available} total={i.totals.exposure.total} />
                </td>
                <td className="px-3.5 py-2 text-right">
                  <TotalCell value={i.totals.engagements.value} available={i.totals.engagements.available} total={i.totals.engagements.total} />
                </td>
                <td className="px-3.5 py-2"><StrongestCell impact={i} /></td>
                <td className="px-3.5 py-2"><StatusBadge impact={i} /></td>
                <td className="px-3.5 py-2 text-right font-mono text-[12px]" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {fmtDate(i.firstPublishedAt)}
                </td>
                <td className="px-3.5 py-2 text-right">
                  <ChevronRight className="inline h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Kart görünümü (telefon) ──────────────────────────────────────────────────

function CardList({ impacts, onOpen }: { impacts: ContentImpact[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {impacts.map((i) => (
        <button
          key={i.cardId}
          onClick={() => onOpen(i.cardId)}
          className="flex flex-col gap-2 rounded-[var(--radius-lg)] p-3 text-left"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-start gap-2.5">
            {i.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.thumbnail} alt="" loading="lazy" className="h-[38px] w-[66px] flex-shrink-0 rounded-[var(--radius-sm)] object-cover" />
            ) : (
              <div className="h-[38px] w-[66px] flex-shrink-0 rounded-[var(--radius-sm)]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{i.title}</p>
              <code className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>#{i.code}</code>
            </div>
            <StatusBadge impact={i} />
          </div>

          <PlatformBadges impact={i} />

          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>
              Erişim{' '}
              <b className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {i.totals.exposure.value == null ? '—' : fmtCompact(i.totals.exposure.value)}
              </b>
            </span>
            <span>
              Etkileşim{' '}
              <b className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {i.totals.engagements.value == null ? '—' : fmtCompact(i.totals.engagements.value)}
              </b>
            </span>
            <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(i.firstPublishedAt)}</span>
          </div>

          <StrongestCell impact={i} />
        </button>
      ))}
    </div>
  );
}
