/**
 * Final metin etiketleyici.
 *
 * Onaydan sonra ve geriye dönük doldurmada AYNI yol kullanılır: metin küçük bir
 * LLM çağrısına gider, üç etiket sözlüğe oturtularak ai_scripts'e yazılır.
 *
 * Doğru kaynak final metindir. Üretimden gelen etiket, kullanıcı metni
 * düzenlediyse yanlış olabilir; bu yüzden sınıflandırma sonucu onun yerini alır.
 * Sınıflandırma başarısız olursa mevcut etiketlere DOKUNULMAZ — boşa çekmek,
 * elde olan tahmini de kaybettirirdi.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { buildClassifyPrompt } from '@/services/ai-engine.prompt';
import { OPENAI_CHAT_URL, OPENAI_MODEL } from '@/services/openai.constants';
import {
  CTA_TYPES,
  HOOK_FAMILIES,
  PAYOFF_TYPES,
  coerceTag,
  type VarietyTags,
} from '@/app/(dashboard)/motor/engine.constants';

const EMPTY: VarietyTags = { hookFamily: null, payoffType: null, ctaType: null };

export interface ClassifyResult {
  tags: VarietyTags;
  error?: string;
}

/** Etiketlerden en az biri dolu mu — hiçbiri değilse yazacak bir şey yok. */
export function hasAnyTag(tags: VarietyTags): boolean {
  return Boolean(tags.hookFamily || tags.payoffType || tags.ctaType);
}

/** Final metni etiketler. Ağ/JSON hatasında etiketler boş, error dolu döner. */
export async function classifyFinalText(
  finalText: string,
  dnaSections: Record<string, string> | null
): Promise<ClassifyResult> {
  if (!finalText.trim()) return { tags: EMPTY, error: 'Final metin boş' };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { tags: EMPTY, error: 'OPENAI_API_KEY tanımlı değil' };

  const { system, user } = buildClassifyPrompt(dnaSections, finalText);
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        // Sınıflandırma bir üretim değil: düşük efor yeterli ve ucuz.
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { tags: EMPTY, error: `OpenAI [${OPENAI_MODEL}] ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { tags: EMPTY, error: `Boş yanıt [${OPENAI_MODEL}]` };
    const parsed = JSON.parse(content);
    return {
      tags: {
        hookFamily: coerceTag(HOOK_FAMILIES, parsed.hook_family),
        payoffType: coerceTag(PAYOFF_TYPES, parsed.payoff_type),
        ctaType: coerceTag(CTA_TYPES, parsed.cta_type),
      },
    };
  } catch (e) {
    return { tags: EMPTY, error: e instanceof Error ? e.message : 'Ağ/JSON hatası' };
  }
}

/**
 * Bir FINAL metni etiketleyip ai_scripts'e yazar. Yalnızca dolu gelen alanlar
 * güncellenir: sınıflandırıcının "emin değilim" dediği alan, elde olan etiketi
 * silmez.
 */
export async function classifyAndSaveScriptTags(
  scriptId: string
): Promise<ClassifyResult> {
  const admin = createAdminClient();
  const { data: script } = await admin
    .from('ai_scripts')
    .select('final_text')
    .eq('id', scriptId)
    .maybeSingle();
  const finalText = (script?.final_text as string) ?? '';
  if (!finalText.trim()) return { tags: EMPTY, error: 'Final metin bulunamadı' };

  const { data: dna } = await admin
    .from('ai_dna')
    .select('sections')
    .eq('is_active', true)
    .maybeSingle();

  const result = await classifyFinalText(
    finalText,
    (dna?.sections as Record<string, string> | undefined) ?? null
  );
  if (result.error || !hasAnyTag(result.tags)) return result;

  const patch: Record<string, string> = {};
  if (result.tags.hookFamily) patch.hook_family = result.tags.hookFamily;
  if (result.tags.payoffType) patch.payoff_type = result.tags.payoffType;
  if (result.tags.ctaType) patch.cta_type = result.tags.ctaType;

  const { error } = await admin.from('ai_scripts').update(patch).eq('id', scriptId);
  return error ? { tags: result.tags, error: error.message } : result;
}

// ── Etiketsiz finaller ──────────────────────────────────────────────────────
// "Etiketsiz final" tanımı TEK yerde durur: panel düğmesi de, backfill komutu
// da aynı ölçüyü kullanır.

export interface FinalScriptRow {
  id: string;
  title: string;
  final_text: string | null;
  hook_family: string | null;
  payoff_type: string | null;
  cta_type: string | null;
}

/** Üç etiketten biri bile eksikse metin etiketsiz sayılır. */
export function isUntagged(row: FinalScriptRow): boolean {
  return !row.hook_family || !row.payoff_type || !row.cta_type;
}

/** final_text'i dolu olan FINAL metinler, onaydan eskiye. */
export async function listFinalScripts(): Promise<FinalScriptRow[]> {
  const { data } = await createAdminClient()
    .from('ai_scripts')
    .select('id, title, final_text, hook_family, payoff_type, cta_type')
    .eq('status', 'FINAL')
    .order('approved_at', { ascending: true });
  return ((data ?? []) as FinalScriptRow[]).filter((r) => r.final_text?.trim());
}

export interface BulkClassifyResult {
  /** Etiketsiz bulunan metin sayısı. */
  total: number;
  /** Etiketi yazılan metin sayısı. */
  tagged: number;
  failures: { title: string; error: string }[];
}

/**
 * Etiketsiz tüm finalleri etiketler. Öğrenme sinyali YAZMAZ — bu bir onay
 * değil, eksik veriyi tamamlama işlemidir; sinyal tablosuna sahte satır düşmez.
 */
export async function classifyUntaggedFinals(): Promise<BulkClassifyResult> {
  const targets = (await listFinalScripts()).filter(isUntagged);
  const failures: BulkClassifyResult['failures'] = [];
  let tagged = 0;

  for (const row of targets) {
    const res = await classifyAndSaveScriptTags(row.id);
    if (res.error) failures.push({ title: row.title, error: res.error });
    else if (hasAnyTag(res.tags)) tagged += 1;
  }
  return { total: targets.length, tagged, failures };
}
