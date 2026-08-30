'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { buildArhavalizePrompt } from '@/services/ai-engine.prompt';
import { PROMPT_VERSION } from './engine.constants';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

async function requireAdmin() {
  const user = await userService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') return null;
  return { id: user.id, role: user.role };
}

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

// ── DNA ──────────────────────────────────────────────────────────────────
export async function saveDna(sections: Record<string, string>): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.saveDna(sections, user.id);
  revalidatePath('/motor/dna');
  return res;
}

// ── Format Playbook ────────────────────────────────────────────────────────
export async function saveFormatPlaybook(
  id: string,
  playbook: Record<string, string>
): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.saveFormatPlaybook(id, playbook);
  revalidatePath('/motor/formatlar');
  return res;
}

// ── References ─────────────────────────────────────────────────────────────
export async function createReference(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };

  const title = str(formData.get('title'));
  const body = str(formData.get('body'));
  if (!title) return { error: 'Başlık zorunlu' };
  if (!body) return { error: 'İçerik metni zorunlu' };

  const tags = (str(formData.get('tags')) ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const res = await aiEngineService.createReference({
    title,
    formatId: str(formData.get('format_id')),
    sourceType: str(formData.get('source_type')) ?? 'SRT',
    body,
    tags,
    notes: str(formData.get('notes')),
    userId: user.id,
  });
  revalidatePath('/motor/referanslar');
  return res;
}

export async function deleteReference(id: string): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.deleteReference(id);
  revalidatePath('/motor/referanslar');
  return res;
}

// ── Scripts ────────────────────────────────────────────────────────────────
export async function createScript(formData: FormData): Promise<{ id?: string; error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };

  const title = str(formData.get('title'));
  if (!title) return { error: 'Başlık zorunlu' };

  const res = await aiEngineService.createScript({
    title,
    topic: str(formData.get('topic')),
    formatId: str(formData.get('format_id')),
    platform: str(formData.get('platform')),
    targetDuration: str(formData.get('target_duration')),
    draftText: str(formData.get('draft_text')),
    sourceFacts: str(formData.get('source_facts')),
    userId: user.id,
  });
  revalidatePath('/motor');
  return res;
}

export async function updateScript(
  id: string,
  patch: Parameters<typeof aiEngineService.updateScript>[1]
): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.updateScript(id, patch);
  revalidatePath(`/motor/${id}`);
  revalidatePath('/motor');
  return res;
}

export async function deleteScript(id: string): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.deleteScript(id);
  revalidatePath('/motor');
  return res;
}

export async function approveFinal(
  id: string,
  finalText: string,
  generationId: string | null
): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  if (!finalText.trim()) return { error: 'Final metin boş olamaz' };
  const res = await aiEngineService.approveFinal(id, finalText, generationId, user.id);
  revalidatePath(`/motor/${id}`);
  revalidatePath('/motor');
  return res;
}

export async function reopenScript(id: string): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  const res = await aiEngineService.reopen(id);
  revalidatePath(`/motor/${id}`);
  return res;
}

// ── Arhavalize (OpenAI) ──────────────────────────────────────────────────────
export async function arhavalize(
  scriptId: string
): Promise<{ generationId?: string; output?: string; notes?: string[]; error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return { error: 'OPENAI_API_KEY tanımlı değil' };

  const script = await aiEngineService.getScript(scriptId);
  if (!script) return { error: 'Metin bulunamadı' };
  if (!script.draft_text?.trim() && !script.source_facts?.trim()) {
    return { error: 'Önce bir taslak ya da bilgi girin — AI bilgi uyduramaz.' };
  }

  const ctx = await aiEngineService.buildContext(script.format_id);
  const { system, user: userMsg } = buildArhavalizePrompt({
    dnaSections: ctx.dna?.sections ?? null,
    formatLabel: ctx.format?.label ?? script.format_label ?? null,
    playbook: ctx.format?.playbook ?? null,
    golds: ctx.golds,
    references: ctx.references,
    input: {
      title: script.title,
      topic: script.topic,
      platform: script.platform,
      targetDuration: script.target_duration,
      draftText: script.draft_text,
      sourceFacts: script.source_facts,
    },
  });

  let output: string;
  let notes: string[] = [];
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { error: `OpenAI hatası (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: 'Boş yanıt geldi' };
    try {
      const parsed = JSON.parse(content);
      output = typeof parsed.script === 'string' ? parsed.script.trim() : '';
      notes = Array.isArray(parsed.notes) ? parsed.notes.map(String).filter(Boolean) : [];
    } catch {
      // Model ignored the JSON contract — fall back to raw text.
      output = String(content).trim();
    }
    if (!output) return { error: 'Model boş metin döndürdü' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ağ hatası' };
  }

  const saved = await aiEngineService.recordGeneration({
    scriptId,
    outputText: output,
    aiNotes: notes,
    dnaVersion: ctx.dna?.version ?? null,
    formatVersion: ctx.format?.version ?? null,
    promptVersion: PROMPT_VERSION,
    model: OPENAI_MODEL,
    userId: user.id,
  });
  if (saved.error) return { error: saved.error };

  revalidatePath(`/motor/${scriptId}`);
  return { generationId: saved.id, output, notes };
}
