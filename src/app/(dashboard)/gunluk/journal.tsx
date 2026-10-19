'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { saveDailyNote } from './actions';
import {
  filterEntries,
  previewOf,
  relativeDayLabel,
  todayKey,
  type JournalEntry,
} from './journal.constants';

/** Yazmayı bıraktıktan kaç ms sonra kaydedilir. */
const AUTOSAVE_DELAY = 900;

type SaveState = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';

/**
 * Günlük: solda günler, sağda o günün sayfası.
 *
 * Kaydet düğmesi yok — yazmayı bırakınca kendi kaydeder. Düğme olsaydı
 * unutulan her not kaybolurdu ve "sisteme yazmak" bir iş gibi hissedilirdi;
 * oysa amaç aklından geçeni bir yere bırakmak.
 */
export function Journal({ entries }: { entries: JournalEntry[] }) {
  const today = todayKey();

  // Gün sayfaları burada tutuluyor: gün değiştirip geri dönünce yazdığın
  // şey kaybolmasın (henüz kaydedilmemiş olsa bile).
  const [bodies, setBodies] = React.useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const e of entries) map[e.note_date] = e.body;
    return map;
  });
  const [activeDay, setActiveDay] = React.useState(today);
  const [query, setQuery] = React.useState('');
  const [state, setState] = React.useState<SaveState>('IDLE');
  const [error, setError] = React.useState<string | null>(null);

  // Listede bugün her zaman var: henüz yazılmamışsa da sayfası açılabilsin.
  const days = React.useMemo(() => {
    const keys = new Set(entries.map((e) => e.note_date));
    keys.add(today);
    keys.add(activeDay);
    return [...keys].sort().reverse();
  }, [entries, today, activeDay]);

  const visibleDays = React.useMemo(
    () => filterEntries(days.map((d) => ({ note_date: d, body: bodies[d] ?? '' })), query),
    [days, bodies, query]
  );

  const body = bodies[activeDay] ?? '';

  // Yazmayı bırakınca kaydet. Her tuşta kaydetmek gereksiz istek üretirdi.
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onChange(next: string) {
    setBodies((prev) => ({ ...prev, [activeDay]: next }));
    setState('SAVING');
    setError(null);
    if (timer.current) window.clearTimeout(timer.current);
    const day = activeDay;
    timer.current = window.setTimeout(async () => {
      const res = await saveDailyNote(day, next);
      if (res.error) {
        setState('ERROR');
        setError(res.error);
      } else {
        setState('SAVED');
      }
    }, AUTOSAVE_DELAY);
  }

  const stateLabel =
    state === 'SAVING' ? 'yazılıyor…'
    : state === 'SAVED' ? 'kaydedildi'
    : state === 'ERROR' ? 'kaydedilemedi'
    : '';

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Günler */}
      <aside className="space-y-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Günlerde ara…"
        />
        <div className="space-y-1">
          {visibleDays.length === 0 ? (
            <p className="px-1 text-xs text-[var(--color-text-muted)]">Eşleşen gün yok.</p>
          ) : (
            visibleDays.map((d) => {
              const active = d.note_date === activeDay;
              const preview = previewOf(d.body);
              return (
                <button
                  key={d.note_date}
                  onClick={() => setActiveDay(d.note_date)}
                  className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--color-accent-muted)' : 'transparent',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                  >
                    {relativeDayLabel(d.note_date)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
                    {preview || 'boş'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* O günün sayfası */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {relativeDayLabel(activeDay)}
          </h2>
          <span
            className="text-xs"
            style={{
              color: state === 'ERROR' ? 'var(--color-error)' : 'var(--color-text-muted)',
            }}
          >
            {stateLabel}
          </span>
        </div>

        <textarea
          value={body}
          onChange={(e) => onChange(e.target.value)}
          rows={22}
          placeholder="Aklında ne varsa yaz. Fikir, plan, olan bir şey, bir sayı — ayırmana gerek yok."
          className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3.5 py-3 text-sm leading-7 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
        />

        {error && <p className="mt-2 text-sm text-[var(--color-error)]">{error}</p>}
      </section>
    </div>
  );
}
