'use server';

import { revalidatePath } from 'next/cache';
import { userService } from '@/services';
import { aiEngineService } from '@/services/ai-engine.service';
import { buildArhavalizePrompt } from '@/services/ai-engine.prompt';
import { OPENAI_CHAT_URL, OPENAI_MODEL } from '@/services/openai.constants';
import {
  classifyAndSaveScriptTags,
  classifyUntaggedFinals,
} from '@/services/ai-classify.service';
import { cleanSubtitle, looksLikeSubtitle } from '@/lib/srt-clean';
import {
  CTA_TYPES,
  HOOK_FAMILIES,
  PAYOFF_TYPES,
  PLATFORM_LABELS,
  PROMPT_VERSION,
  coerceHookAlternatives,
  coerceTag,
  type EnginePlatform,
  type HookAlternative,
  type VarietyTags,
} from './engine.constants';

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
  const res = await aiEngineService.saveFormatPlaybook(id, playbook, user.id);
  revalidatePath('/motor/formatlar');
  return res;
}

/** Playbook history for one format (admin only). */
export async function getFormatVersions(formatId: string) {
  const user = await requireAdmin();
  if (!user) return [];
  return aiEngineService.getFormatVersions(formatId);
}

// ── References ─────────────────────────────────────────────────────────────
export async function createReference(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };

  const title = str(formData.get('title'));
  const raw = str(formData.get('body'));
  if (!title) return { error: 'Başlık zorunlu' };
  if (!raw) return { error: 'İçerik metni zorunlu' };

  const sourceType = str(formData.get('source_type')) ?? 'SRT';

  // Subtitles get cleaned into a flowing paragraph before storage; plain text
  // is auto-cleaned only if it actually looks like a subtitle file. The model
  // sees `body` (clean_content); the original is kept in raw_content.
  const shouldClean = sourceType === 'SRT' || sourceType === 'VIDEO' || looksLikeSubtitle(raw);
  const clean = shouldClean ? cleanSubtitle(raw) : raw;
  if (!clean) return { error: 'Temizleme sonrası metin boş kaldı — SRT içeriğini kontrol et.' };

  const tags = (str(formData.get('tags')) ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const res = await aiEngineService.createReference({
    title,
    formatId: str(formData.get('format_id')),
    sourceType,
    body: clean,
    rawContent: clean === raw ? null : raw,
    tags,
    notes: str(formData.get('notes')),
    useInRetrieval: formData.get('use_in_retrieval') !== null,
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
  const formatId = str(formData.get('format_id'));
  const draftText = str(formData.get('draft_text'));
  const targetDuration = str(formData.get('target_duration'));

  // The non-negotiable trio: Format + Taslak + Hedef Süre.
  if (!title) return { error: 'İçerik adı zorunlu' };
  if (!formatId) return { error: 'Format seçimi zorunlu' };
  if (!draftText) return { error: 'Taslak metin zorunlu' };
  if (!targetDuration) return { error: 'Hedef süre zorunlu' };

  const res = await aiEngineService.createScript({
    title,
    topic: str(formData.get('topic')),
    formatId,
    platform: str(formData.get('platform')),
    targetDuration,
    draftText,
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
  generationId: string | null,
  /** "Neyi değiştirdin, neden?" — serbest, zorunlu değil. */
  editReason?: string | null,
  /** Kullanıcının seçtiği hook ailesi — çeşitlilik kaydına bu gider. */
  chosenHookFamily?: string | null
): Promise<{ error?: string; warning?: string }> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };
  if (!finalText.trim()) return { error: 'Final metin boş olamaz' };
  const res = await aiEngineService.approveFinal(
    id,
    finalText,
    generationId,
    user.id,
    editReason ?? null,
    chosenHookFamily ?? null
  );
  if (res.error) return res;

  // Etiketleri final metinden yeniden çıkar: kullanıcı metni düzenlemiş
  // olabilir, doğru kaynak üretimin beyanı değil ONAYLANAN metindir.
  // Başarısız olursa onay geri alınmaz; üretimden gelen etiket yerinde kalır.
  const classified = await classifyAndSaveScriptTags(id);
  const warnings = [res.warning, classified.error && `Etiketleme yapılamadı: ${classified.error}`]
    .filter(Boolean)
    .join(' · ');

  revalidatePath(`/motor/${id}`);
  revalidatePath('/motor');
  revalidatePath('/motor/ogrenme');
  return warnings ? { warning: warnings } : {};
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
): Promise<{
  generationId?: string;
  output?: string;
  notes?: string[];
  tags?: VarietyTags;
  hookAlternatives?: HookAlternative[];
  error?: string;
}> {
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
    recentTags: ctx.recentTags,
    input: {
      title: script.title,
      topic: script.topic,
      platform: script.platform
        ? PLATFORM_LABELS[script.platform as EnginePlatform] ?? script.platform
        : null,
      targetDuration: script.target_duration,
      draftText: script.draft_text,
      sourceFacts: script.source_facts,
    },
  });

  let output: string;
  let notes: string[] = [];
  let tags: VarietyTags = { hookFamily: null, payoffType: null, ctaType: null };
  let hookAlternatives: HookAlternative[] = [];
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        // temperature YOK: GPT-5 ailesi bu parametreyi reddediyor (400,
        // "Only the default (1) value is supported"). Çeşitlilik burada
        // sıcaklıkla değil, reasoning_effort ve prompt ile ayarlanır.
        // GPT-5.6 supports reasoning; medium balances quality vs. cost.
        reasoning_effort: 'medium',
        response_format: { type: 'json_object' },
        // No max token cap — length is driven by the target duration carried in
        // the prompt, not by inflating the output budget.
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // Name the model so we know which one failed — no silent fallback.
      return { error: `OpenAI hatası [${OPENAI_MODEL}] (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: `Boş yanıt geldi [${OPENAI_MODEL}]` };
    try {
      const parsed = JSON.parse(content);
      output = typeof parsed.script === 'string' ? parsed.script.trim() : '';
      notes = Array.isArray(parsed.notes) ? parsed.notes.map(String).filter(Boolean) : [];
      // Sözlük dışı bir etiket null olur; uydurma etiket çeşitlilik listesini
      // sessizce bozar, o yüzden kaydedilmez.
      tags = {
        hookFamily: coerceTag(HOOK_FAMILIES, parsed.hook_family),
        payoffType: coerceTag(PAYOFF_TYPES, parsed.payoff_type),
        ctaType: coerceTag(CTA_TYPES, parsed.cta_type),
      };
      hookAlternatives = coerceHookAlternatives(parsed.hook_alternatives);
    } catch {
      // Model ignored the JSON contract — fall back to raw text.
      output = String(content).trim();
    }
    if (!output) return { error: `Model boş metin döndürdü [${OPENAI_MODEL}]` };
  } catch (e) {
    return { error: `${e instanceof Error ? e.message : 'Ağ hatası'} [${OPENAI_MODEL}]` };
  }

  const saved = await aiEngineService.recordGeneration({
    scriptId,
    outputText: output,
    aiNotes: notes,
    dnaVersion: ctx.dna?.version ?? null,
    formatVersion: ctx.format?.version ?? null,
    promptVersion: PROMPT_VERSION,
    model: OPENAI_MODEL,
    referenceIds: ctx.references.map((r) => r.id),
    goldStandardScriptIds: ctx.golds.map((g) => g.id),
    tags,
    hookAlternatives,
    userId: user.id,
  });
  if (saved.error) return { error: saved.error };

  revalidatePath(`/motor/${scriptId}`);
  return { generationId: saved.id, output, notes, tags, hookAlternatives };
}

/**
 * Etiketsiz FINAL metinleri toplu etiketler (Öğrenme sayfasındaki düğme).
 *
 * Onay akışından ayrıdır ve öğrenme sinyali YAZMAZ: bu bir yeniden onay değil,
 * eksik veriyi tamamlama işlemidir. Yeniden onaylatmak sinyal tablosuna gerçek
 * bir düzenlemeye karşılık gelmeyen satır düşürürdü.
 */
export async function tagUntaggedFinals(): Promise<{
  total?: number;
  tagged?: number;
  failures?: { title: string; error: string }[];
  error?: string;
}> {
  const user = await requireAdmin();
  if (!user) return { error: 'Yetki yok' };

  const res = await classifyUntaggedFinals();
  revalidatePath('/motor/ogrenme');
  revalidatePath('/motor');
  return res;
}
