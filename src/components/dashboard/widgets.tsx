/**
 * Dashboard görsel parçaları (Tessera dili) — yayıncı, admin ve diğer roller
 * aynı parçaları kullanır: OverviewCard · WorkloadStrip · CapacityCard · BarsChart
 */

import { Info, TrendingUp, TrendingDown, Cloud, Clock, type LucideIcon } from 'lucide-react';

/** İnce çapraz tarama — iz/boş alan dokusu */
const HATCH = 'repeating-linear-gradient(135deg, var(--color-border) 0 1.5px, transparent 1.5px 7px)';

const CARD = 'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]';

export function shortTL(n: number): string {
  if (Math.abs(n) >= 1000) return `₺${(n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} bin`;
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

/** Kart başlığı + sağda küçük etiket (chip) */
function Head({ title, subtitle, chip, chipInverted }: { title: string; subtitle?: string; chip?: string; chipInverted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {chip && (
        chipInverted ? (
          <span className="flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-text-primary)] px-2.5 py-1 text-xs font-medium text-[var(--color-bg-primary)]">
            {chip}
          </span>
        ) : (
          <span className="flex flex-shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
            <Clock className="h-3.5 w-3.5" /> {chip}
          </span>
        )
      )}
    </div>
  );
}

/* ── Bölüm başlığı ── */

export function SectionHead({ title, chip }: { title: string; chip?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {chip && (
        <span className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
          <Clock className="h-3.5 w-3.5" /> {chip}
        </span>
      )}
    </div>
  );
}

/* ── Genel bakış kartı ─────────────────────────────────────────── */

export function OverviewCard({
  label, hint, value, trend, trendText, icon: Icon, iconColor,
}: {
  label: string; hint: string; value: string;
  trend: 'up' | 'down' | 'neutral'; trendText: string;
  icon: LucideIcon; iconColor: string;
}) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;
  const trendColor = trend === 'down' ? 'var(--color-error)' : trend === 'up' ? 'var(--color-success)' : 'var(--color-text-muted)';
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm text-[var(--color-text-secondary)]">
          {label}
          <Info className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-muted)]" aria-label={hint}>
            <title>{hint}</title>
          </Info>
        </p>
        <Icon className="h-5 w-5 flex-shrink-0" style={{ color: iconColor }} />
      </div>
      <p className="mt-5 truncate text-[28px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="mt-2.5 flex items-center gap-1.5 truncate text-xs" style={{ color: trendColor }}>
        {trend !== 'neutral' && <TrendIcon className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className={trend === 'neutral' ? '' : 'font-medium'}>{trendText}</span>
      </p>
    </div>
  );
}

/* ── Dönem kartı: bu ay (büyük) + toplam (küçük) ────────────────
 * Telefonda 2×2 ızgarada sığacak kadar kompakt; büyük ekranda ferahlar. */

export function PeriodStatCard({
  label, icon: Icon, iconColor, month, monthLabel = 'Bu ay', total, totalLabel = 'Toplam', note,
}: {
  label: string; icon: LucideIcon; iconColor: string;
  /** Bu ayın değeri (biçimlenmiş). */
  month: string;
  monthLabel?: string;
  /** Tüm zamanların değeri (biçimlenmiş). */
  total: string;
  totalLabel?: string;
  /** İsteğe bağlı kısa not (ör. "+2 geçen aya göre"). */
  note?: { text: string; tone: 'up' | 'down' | 'neutral' };
}) {
  const noteColor = note?.tone === 'down' ? 'var(--color-error)' : note?.tone === 'up' ? 'var(--color-success)' : 'var(--color-text-muted)';
  return (
    <div className={`${CARD} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-[var(--color-text-secondary)] sm:text-sm">{label}</p>
        <Icon className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" style={{ color: iconColor }} />
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] sm:mt-3">{monthLabel}</p>
      <p className="truncate text-xl font-semibold leading-tight tracking-tight tabular-nums text-[var(--color-text-primary)] sm:text-[26px]">
        {month}
      </p>
      {note && (
        <p className="mt-0.5 truncate text-[11px] sm:text-xs" style={{ color: noteColor }}>{note.text}</p>
      )}
      {/* Telefonda etiket üstte, tutar altta — dar kartta para tutarı kesilmesin */}
      <div className="mt-2.5 flex flex-col gap-0.5 border-t border-[var(--color-border)] pt-2 sm:mt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <span className="text-[11px] text-[var(--color-text-muted)] sm:text-xs">{totalLabel}</span>
        <span className="text-sm font-medium tabular-nums text-[var(--color-text-secondary)]">{total}</span>
      </div>
    </div>
  );
}

/* ── Halkalı iş yükü şeridi ───────────────────────────────────── */

export interface WorkloadItem { label: string; count: number; color: string; sub: string; avatars?: string[] }

export function WorkloadStrip({
  title = 'İş yükü', openLabel, items,
}: { title?: string; openLabel: string; items: WorkloadItem[] }) {
  const total = Math.max(items.reduce((s, i) => s + i.count, 0), 1);
  const C = 2 * Math.PI * 14;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <Cloud className="h-3.5 w-3.5" /> {openLabel}
        </span>
      </div>
      {/* gap-px + kenar rengi zemin = her kolon sayısında 1px iç ayraç */}
      <div className={`grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-border)] ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 2xl:grid-cols-4'}`}>
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 bg-[var(--color-bg-secondary)] px-4 py-3">
            <div className="relative h-9 w-9 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" style={{ stroke: 'var(--color-bg-tertiary)' }} />
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(it.count / total) * C} ${C}`} style={{ stroke: it.color }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
                {it.count}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{it.label}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{it.sub}</p>
            </div>
            {it.avatars && it.avatars.length > 0 && (
              <div className="flex flex-shrink-0 -space-x-1.5">
                {it.avatars.slice(0, 2).map((a, i) => (
                  <span key={`${a}-${i}`} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-bg-secondary)] bg-[var(--color-bg-tertiary)] text-[9px] font-semibold text-[var(--color-text-secondary)]">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Kapasite kartı (dikey çizgili segmentler + alt bar) ───────── */

export interface CapacitySegment { label: string; amount: number; color: string; hatched?: boolean }

export function CapacityCard({
  title, subtitle, chip, total, totalLabel, segments, format = shortTL,
}: {
  title: string; subtitle: string; chip: string;
  total: number; totalLabel: string; segments: CapacitySegment[];
  /** Tutar biçimi — varsayılan kısa TL ("₺4,5 bin"); adet için String verin */
  format?: (n: number) => string;
}) {
  const sum = segments.reduce((s, x) => s + Math.max(x.amount, 0), 0);
  return (
    <div className={`${CARD} flex flex-col p-5`}>
      <Head title={title} subtitle={subtitle} chip={chip} />
      <p className="mt-5 flex items-baseline gap-2">
        <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-text-primary)]">{format(total)}</span>
        <span className="text-sm text-[var(--color-text-muted)]">{totalLabel}</span>
      </p>
      <div className="mt-6 flex h-32 gap-1.5">
        {segments.map((s) => {
          const pct = sum > 0 ? Math.round((Math.max(s.amount, 0) / sum) * 100) : 0;
          return (
            <div key={s.label} className="flex min-w-[76px] flex-col" style={{ flexGrow: sum > 0 ? Math.max(pct, 1) : 1, flexBasis: 0 }}>
              <div className="flex items-baseline gap-1.5 pl-2">
                <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">{pct}%</span>
                <span className="truncate text-[11px] tabular-nums text-[var(--color-text-muted)]">{format(s.amount)}</span>
              </div>
              <div className="mt-1.5 flex-1 border-l border-[var(--color-border-hover)]" />
              <div className="h-2.5 rounded-full"
                style={s.hatched ? { backgroundImage: HATCH, backgroundColor: 'var(--color-bg-tertiary)' } : { backgroundColor: s.color }} />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full" style={{ background: s.hatched ? 'var(--color-text-secondary)' : s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Çubuk grafik (taralı izler, hedef çizgisi, vurgu balonu) ──── */

export function BarsChart({
  title, subtitle, chip, data, highlightIndex, callout, avgPrefix = 'Ort.', emptyText = 'Henüz veri yok', format = String,
}: {
  title: string; subtitle: string; chip: string;
  data: { label: string; value: number }[];
  /** Vurgulanan çubuk (mavi + balon). Varsayılan: son çubuk. */
  highlightIndex?: number;
  callout?: string | null;
  avgPrefix?: string;
  emptyText?: string;
  /** Çubuk içi ve ortalama değer biçimi — varsayılan sade sayı */
  format?: (n: number) => string;
}) {
  const hi = highlightIndex ?? data.length - 1;
  const active = data.filter((d) => d.value > 0);
  const avg = active.length ? active.reduce((s, d) => s + d.value, 0) / active.length : 0;
  const top = Math.max(...data.map((d) => d.value), avg, 1) * 1.25;
  const colorFor = (v: number, i: number) =>
    i === hi ? 'var(--color-accent)'
      : v === 0 ? 'var(--color-border-hover)'
        : v >= avg ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <div className={`${CARD} flex flex-col p-5`}>
      <Head title={title} subtitle={subtitle} chip={chip} chipInverted />
      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-16 text-sm text-[var(--color-text-muted)]">{emptyText}</p>
      ) : (
        <>
          <div className="relative mt-6 flex h-52 gap-2.5">
            {avg > 0 && (
              <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-[var(--color-text-muted)]" style={{ bottom: `${(avg / top) * 100}%` }}>
                <span className="absolute right-0 -translate-y-1/2 rounded-md border border-[var(--color-border-hover)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                  {avgPrefix} {format === String ? avg.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : format(avg)}
                </span>
              </div>
            )}
            {data.map((d, i) => {
              const h = (d.value / top) * 100;
              return (
                <div key={i} className="relative h-full flex-1 rounded-lg" style={{ backgroundImage: HATCH, backgroundColor: 'var(--color-surface-sunken)' }}>
                  {d.value > 0 && (
                    <div className="absolute inset-x-0 bottom-0 rounded-lg" style={{ height: `${h}%`, minHeight: 24, background: colorFor(d.value, i) }}>
                      <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold tabular-nums text-white">{format(d.value)}</span>
                    </div>
                  )}
                  {i === hi && d.value > 0 && callout && (
                    <span className="absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bg-primary)]"
                      style={{ bottom: `calc(max(${h}%, 24px) + 8px)` }}>
                      {callout}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2.5">
            {data.map((d, i) => (
              <div key={i} className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white" style={{ background: colorFor(d.value, i) }}>
                  {d.label.charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-[11px] text-[var(--color-text-secondary)]">{d.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
