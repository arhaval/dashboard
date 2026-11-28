'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { visibleSections } from './nav-config';

/** Bu kadar sayfası olmayan rollerde arama gösterilmez. */
const MIN_PAGES_FOR_SEARCH = 8;

interface CommandPaletteProps {
  userRole: string;
  allowedPages: string[];
}

/**
 * Üst bardaki arama kutusu + ⌘K / Ctrl+K hızlı geçiş.
 * Sadece rolün görebildiği sayfaları listeler (nav-config ile aynı kural).
 */
export function CommandPalette({ userRole, allowedPages }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const items = React.useMemo(
    () => visibleSections(userRole, allowedPages).flatMap((s) => s.items.map((i) => ({ ...i, section: s.label }))),
    [userRole, allowedPages]
  );

  const q = query.trim().toLocaleLowerCase('tr-TR');
  const results = q ? items.filter((i) => i.label.toLocaleLowerCase('tr-TR').includes(q)) : items;

  // Global kısayol
  React.useEffect(() => {
    if (items.length < MIN_PAGES_FOR_SEARCH) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Az sayfalı rollerde (ör. yayıncı) arama gürültü — menü zaten hepsini gösteriyor.
  const enabled = items.length >= MIN_PAGES_FOR_SEARCH;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[index]) go(results[index].href);
  };

  if (!enabled) return null;

  return (
    <>
      {/* Üst bardaki arama kutusu */}
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-[340px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-hover)] md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Sayfa ara…</span>
        <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[15vh]" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4">
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
                onKeyDown={onInputKey}
                placeholder="Sayfa ara…"
                className="h-12 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <kbd className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">Sonuç yok</li>
              ) : (
                results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <li key={r.href}>
                      <button
                        onMouseEnter={() => setIndex(i)}
                        onClick={() => go(r.href)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm',
                          i === index ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{r.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{r.section}</span>
                        {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
