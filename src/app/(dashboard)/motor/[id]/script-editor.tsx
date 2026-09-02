'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  STATUS_META,
  PLATFORM_OPTIONS,
  DRAFT_SAFETY_NOTE,
  type FormatDTO,
  type GenerationDTO,
  type ScriptDTO,
} from '../engine.constants';
import { DurationSelect } from '../duration-select';
import {
  updateScript,
  deleteScript,
  arhavalize,
  approveFinal,
  reopenScript,
} from '../actions';

export function ScriptEditor({
  script,
  formats,
  keyReady,
}: {
  script: ScriptDTO;
  formats: FormatDTO[];
  keyReady: boolean;
}) {
  const router = useRouter();

  // Source panel state (Step 1)
  const [title, setTitle] = React.useState(script.title);
  const [topic, setTopic] = React.useState(script.topic ?? '');
  const [formatId, setFormatId] = React.useState(script.format_id ?? '');
  const [platform, setPlatform] = React.useState(script.platform ?? '');
  const [duration, setDuration] = React.useState(script.target_duration ?? '');
  const [draft, setDraft] = React.useState(script.draft_text ?? '');
  const [facts, setFacts] = React.useState(script.source_facts ?? '');

  // Generation state (Step 2/3)
  const [generations, setGenerations] = React.useState<GenerationDTO[]>(script.generations ?? []);
  // Onay anında sorulan tek satırlık gerekçe — öğrenme sinyaline yazılır.
  const [editReason, setEditReason] = React.useState('');
  const [status, setStatus] = React.useState(script.status);
  const latestGen = generations[0] ?? null;
  const [finalText, setFinalText] = React.useState(
    script.final_text ?? script.generations?.[0]?.output_text ?? ''
  );
  const [basedOn, setBasedOn] = React.useState<string | null>(
    script.final_generation_id ?? script.generations?.[0]?.id ?? null
  );

  const [saving, startSave] = React.useTransition();
  const [generating, startGen] = React.useTransition();
  const [approving, startApprove] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const meta = STATUS_META[status];

  function saveSource() {
    setErr(null);
    setMsg(null);
    startSave(async () => {
      const res = await updateScript(script.id, {
        title,
        topic: topic || null,
        formatId: formatId || null,
        platform: platform || null,
        targetDuration: duration || null,
        draftText: draft || null,
        sourceFacts: facts || null,
      });
      if (res.error) setErr(res.error);
      else setMsg('Kaynak kaydedildi.');
    });
  }

  function runArhavalize() {
    setErr(null);
    setMsg(null);
    startGen(async () => {
      // Persist source first so the generation uses the latest text.
      await updateScript(script.id, {
        title,
        topic: topic || null,
        formatId: formatId || null,
        platform: platform || null,
        targetDuration: duration || null,
        draftText: draft || null,
        sourceFacts: facts || null,
      });
      const res = await arhavalize(script.id);
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.generationId && res.output) {
        const gen: GenerationDTO = {
          id: res.generationId,
          script_id: script.id,
          output_text: res.output,
          ai_notes: res.notes ?? [],
          dna_version: null,
          format_version: null,
          prompt_version: null,
          model: null,
          reference_ids: [],
          gold_standard_script_ids: [],
          created_at: new Date().toISOString(),
        };
        setGenerations((prev) => [gen, ...prev]);
        setFinalText(res.output);
        setBasedOn(res.generationId);
        setStatus('AI_EDITED');
        setMsg('Arhavalize edildi. Aşağıda düzenleyip final onayla.');
      }
    });
  }

  function loadGeneration(g: GenerationDTO) {
    setFinalText(g.output_text);
    setBasedOn(g.id);
  }

  function onApprove() {
    setErr(null);
    setMsg(null);
    startApprove(async () => {
      const res = await approveFinal(script.id, finalText, basedOn, editReason);
      if (res.error) setErr(res.error);
      else {
        setStatus('FINAL');
        // Sinyal yazılamasa bile final geçerlidir; uyarı hatanın yerini almaz.
        if (res.warning) setErr(res.warning);
        setMsg('Final onaylandı — gold standard olarak kaydedildi.');
      }
    });
  }

  function onReopen() {
    startApprove(async () => {
      const res = await reopenScript(script.id);
      if (!res.error) setStatus('AI_EDITED');
    });
  }

  function onDelete() {
    if (!confirm('Bu metni silmek istediğine emin misin?')) return;
    startSave(async () => {
      const res = await deleteScript(script.id);
      if (!res.error) router.push('/motor');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/motor')}>
            ← Liste
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Sil
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Step 1: Source ─────────────────────────────────────────── */}
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">1 · Kaynak</h3>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">İçerik adı *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Konu / Bağlam (opsiyonel)</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Format *</label>
              <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                <option value="">— Format seç —</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Platform</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">—</option>
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">Hedef süre *</label>
              <DurationSelect value={duration} onChange={setDuration} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Taslak metin *</label>
            <p className="mb-1.5 mt-0.5 rounded-[var(--radius-md)] border border-[var(--color-info)] bg-[var(--color-info-muted)] px-3 py-1.5 text-xs text-[var(--color-info)]">
              🔒 {DRAFT_SAFETY_NOTE}
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Ek nesnel bilgiler</label>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveSource} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
            <Button onClick={runArhavalize} disabled={generating || !keyReady}>
              {generating ? 'Arhavalize ediliyor…' : '⚡ Arhavalize Et'}
            </Button>
          </div>
          {!keyReady && (
            <p className="text-xs text-[var(--color-warning)]">
              OPENAI_API_KEY eklenene kadar Arhavalize devre dışı.
            </p>
          )}
        </section>

        {/* ── Step 2/3: Generation + Final ───────────────────────────── */}
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            2 · AI Çıktısı &amp; Final
          </h3>

          {latestGen?.ai_notes && latestGen.ai_notes.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-info)] bg-[var(--color-info-muted)] p-3">
              <p className="text-xs font-semibold text-[var(--color-info)]">
                AI’ın eklemeyi önerdiği (metne konmadı):
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-[var(--color-text-secondary)] space-y-0.5">
                {latestGen.ai_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--color-text-muted)]">
              Final metin {basedOn && status !== 'FINAL' ? '(düzenleyebilirsin)' : ''}
            </label>
            <textarea
              value={finalText}
              onChange={(e) => setFinalText(e.target.value)}
              rows={16}
              readOnly={status === 'FINAL'}
              placeholder="Önce ‘Arhavalize Et’e bas ya da doğrudan buraya yaz."
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
            />
          </div>

          {status !== 'FINAL' && (
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">
                Neyi değiştirdin, neden?{' '}
                <span className="text-[var(--color-text-muted)]">
                  — isteğe bağlı, boş bırakabilirsin
                </span>
              </label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="ör. hook fazla uzundu, ilk iki cümleyi tek cümleye indirdim"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {status === 'FINAL' ? (
              <Button variant="outline" onClick={onReopen} disabled={approving}>
                Yeniden Aç
              </Button>
            ) : (
              <Button onClick={onApprove} disabled={approving || !finalText.trim()}>
                {approving ? 'Onaylanıyor…' : '✓ Final Olarak Onayla'}
              </Button>
            )}
          </div>

          {generations.length > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">
                Üretim geçmişi ({generations.length})
              </p>
              <div className="space-y-1.5">
                {generations.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => loadGeneration(g)}
                    className={`w-full text-left rounded-[var(--radius-md)] border px-3 py-2 text-xs transition-colors ${
                      basedOn === g.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-primary)]">
                        Üretim #{generations.length - i}
                        {g.model ? ` · ${g.model}` : ''}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {new Date(g.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[var(--color-text-muted)]">
                      {g.output_text.slice(0, 160)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {(msg || err) && (
        <p className={`text-sm ${err ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
          {err || msg}
        </p>
      )}
    </div>
  );
}
