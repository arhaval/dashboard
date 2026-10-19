'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { wordCount } from '@/app/(dashboard)/motor/ogrenme/learning.constants';

/**
 * Kartın metnini seslendirilebilir biçimde gösterir.
 *
 * Kart içindeki özet 11px'ti: önizleme için doğru, mikrofon başında okumak için
 * değil. Burada punto okunur, satır aralığı açık, uzun metin kendi içinde
 * kayar (kart büyüyüp kolonu dağıtmasın) ve tek tuşla kopyalanabilir.
 */
export function ScriptReader({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const words = wordCount(text);

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Pano izni yoksa metin ekranda zaten açık — elle seçilebilir.
      setCopied(false);
    }
  }

  return (
    <div
      className="rounded-[var(--radius-sm)]"
      style={{ backgroundColor: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {words ? `${words} kelime` : 'Metin'}
        </span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-70"
          style={{
            backgroundColor: copied ? 'var(--color-success-muted)' : 'var(--color-bg-tertiary)',
            color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
          }}
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <p
        className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap px-3 py-2.5 text-sm leading-7"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {text}
      </p>
    </div>
  );
}
