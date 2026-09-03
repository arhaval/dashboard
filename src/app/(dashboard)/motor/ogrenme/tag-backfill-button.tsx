'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { tagUntaggedFinals } from '../actions';

/**
 * Etiketsiz finalleri toplu etiketler. Sunucuda çalışır (OpenAI anahtarı
 * orada); onay akışına dokunmaz, öğrenme sinyali yazmaz.
 */
export function TagBackfillButton({ untagged }: { untagged: number }) {
  const router = useRouter();
  const [running, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function run() {
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await tagUntaggedFinals();
      if (res.error) {
        setErr(res.error);
        return;
      }
      const failed = res.failures ?? [];
      if (failed.length > 0) {
        setErr(
          `${res.tagged}/${res.total} metin etiketlendi. Kalanlar: ` +
            failed.map((f) => `${f.title} — ${f.error}`).join(' · ')
        );
      } else if (res.total === 0) {
        setMsg('Etiketsiz final yok.');
      } else {
        setMsg(`${res.tagged}/${res.total} metin etiketlendi.`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={run} disabled={running || untagged === 0}>
        {running ? 'Etiketleniyor…' : `Etiketsiz finalleri etiketle (${untagged})`}
      </Button>
      {untagged === 0 && !msg && !err && (
        <span className="text-xs text-[var(--color-text-muted)]">
          Tüm finaller etiketli.
        </span>
      )}
      {(msg || err) && (
        <span className={`text-xs ${err ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
          {err || msg}
        </span>
      )}
    </div>
  );
}
