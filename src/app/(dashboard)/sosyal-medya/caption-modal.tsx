'use client';

/**
 * CaptionModal + CaptionCell
 *
 * CaptionCell   — Metni kırpar, "Metni Aç" butonu gösterir
 * CaptionModal  — Tam metni dikey kaydırmalı modal'da sunar
 */

import { useState } from 'react';
import { X, Eye } from 'lucide-react';

const TRUNCATE_AT = 60;

// ── Modal ─────────────────────────────────────────────────────────────────────

export function CaptionModal({
  title,
  caption,
  onClose,
}: {
  title: string;
  caption: string;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl pointer-events-auto rounded-[var(--radius-lg)] overflow-hidden shadow-2xl flex flex-col"
          style={{ background: 'var(--color-bg-secondary)', maxHeight: '80vh' }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between gap-4 px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Caption / Açıklama
              </p>
              <h2
                className="text-sm font-bold leading-snug"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-md)] transition-colors hover:bg-white/5 flex-shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {caption}
            </p>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-3 flex-shrink-0 flex justify-end"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[var(--radius-md)] text-xs font-semibold border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CaptionCell ───────────────────────────────────────────────────────────────

export function CaptionCell({
  title,
  caption,
  className,
}: {
  title: string;
  caption: string | null | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!caption) return null;

  const isLong    = caption.length > TRUNCATE_AT;
  const preview   = isLong ? caption.substring(0, TRUNCATE_AT) + '…' : caption;

  return (
    <>
      <span className={className} style={{ color: 'var(--color-text-muted)' }}>
        {preview}
        {isLong && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(true); }}
            className="inline-flex items-center gap-1 ml-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70 align-middle"
            style={{ color: 'var(--color-accent)' }}
            title="Metni Aç"
          >
            <Eye size={11} /> Metni Aç
          </button>
        )}
      </span>

      {open && (
        <CaptionModal
          title={title}
          caption={caption}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
