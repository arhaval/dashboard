'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { sendToVoice } from '../actions';
import {
  HANDOFF_LABELS,
  handoffTargetFor,
  type ScriptHandoff,
} from '../voice-handoff.constants';
import { PLATFORM_LABELS as QUEUE_PLATFORM_LABELS } from '@/app/(dashboard)/icerik-plani/content-queue.constants';
import type { EnginePlatform } from '../engine.constants';

export interface VoicePerson {
  id: string;
  name: string;
}

/**
 * Final onaylandıktan sonraki tek adım: metni seslendirmene teslim et.
 * Gönderdikten sonra aynı yerde sesin gelip gelmediği görünür, böylece
 * teslim almak için İçerik Planı'na geçmek gerekmez.
 */
export function VoiceHandoffPanel({
  scriptId,
  platform,
  voicePeople,
  handoff,
}: {
  scriptId: string;
  platform: EnginePlatform | null;
  voicePeople: VoicePerson[];
  handoff: ScriptHandoff | null;
}) {
  const router = useRouter();
  const [assignee, setAssignee] = React.useState(voicePeople[0]?.id ?? '');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  const target = handoffTargetFor(platform);
  const platformText = target.platforms.map((p) => QUEUE_PLATFORM_LABELS[p]).join(', ');

  function onSend() {
    setErr(null);
    startTransition(async () => {
      const res = await sendToVoice(scriptId, assignee, date || null);
      if (res.error) setErr(res.error);
      else router.refresh();
    });
  }

  if (handoff) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {HANDOFF_LABELS[handoff.stage]}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {handoff.assigneeName
                ? `${handoff.assigneeName} seslendiriyor · İçerik Planı'nda takip edilir`
                : "İçerik Planı'nda takip edilir"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {handoff.voiceUrl && (
              <a
                href={handoff.voiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius-md)] border border-[var(--color-info)] bg-[var(--color-info-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-info)]"
              >
                🎙 Ses dosyası
              </a>
            )}
            <a
              href="/icerik-plani"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              İçerik Planı →
            </a>
          </div>
        </div>
        {!handoff.voiceUrl && (
          <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
            Ses linki geldiğinde burada görünür — ayrıca bildirim alırsın.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Seslendirmeye gönder</p>
      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
        Metin olduğu gibi İçerik Planı kartına geçer ({platformText} · {target.contentType}) ve
        seçtiğin kişiye bildirim gider. Kopyalama yok.
      </p>

      {voicePeople.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--color-warning)]">
          Seslendirmen rolünde aktif kullanıcı yok — Ekip sayfasından ekle.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Seslendirecek kişi</label>
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                {voicePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Planlanan yayın tarihi</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {err && <p className="mt-2 text-sm text-[var(--color-error)]">{err}</p>}
          <Button className="mt-3" onClick={onSend} disabled={isPending || !assignee}>
            {isPending ? 'Gönderiliyor…' : '🎙 Seslendirmeye Gönder'}
          </Button>
        </>
      )}
    </div>
  );
}
