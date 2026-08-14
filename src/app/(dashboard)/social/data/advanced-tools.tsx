'use client';

/**
 * Gelişmiş İşlemler — normal akışta gerekmeyen araçlar.
 *
 * Manuel form, CSV yükleme ve "Geçmişi Doldur" buraya kapalı olarak taşındı.
 * Normal kullanıcı akışı "Eksik Verileri Tamamla"dır; bunlar düzeltme ve
 * toplu işlem araçları.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';

export function AdvancedTools({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="rounded-[var(--radius-md)]"
      style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Wrench className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Gelişmiş İşlemler
        </span>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          manuel düzenleme · CSV · geçmişi doldur
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </section>
  );
}
