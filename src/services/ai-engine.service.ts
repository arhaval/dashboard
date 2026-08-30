/**
 * İçerik Motoru (AI Content Engine) service.
 *
 * Standalone editorial-memory system, intentionally NOT linked to the rest of
 * the panel yet. All tables are RLS-locked, so every read/write goes through
 * the service-role admin client here; server actions above enforce roles.
 *
 * Layers:
 *  1. DNA          — ai_dna (versioned identity)
 *  2. Format       — ai_formats (per-format playbook, versioned)
 *  -  References   — ai_references (not-ours style material)
 *  3. Scripts      — ai_scripts (approved final = gold standard)
 *  4. Generations  — ai_generations (every Arhavalize run, with versions)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DnaDTO,
  FormatDTO,
  GenerationDTO,
  ReferenceDTO,
  ScriptDTO,
  ScriptStatus,
} from '@/app/(dashboard)/motor/engine.constants';

/** How many gold-standard + reference examples to inject into a prompt. */
const MAX_GOLD_EXAMPLES = 3;
const MAX_REFERENCE_EXAMPLES = 3;

/**
 * Example excerpt budget. A flat "first N chars" would show the hook but cut the
 * body's end and the payoff — the very things style learning needs. So a long
 * example is represented by its head + middle + tail, keeping hook, narrative
 * body, and payoff from the SAME reference. Short examples are sent whole.
 */
const EXCERPT_HEAD = 2000;
const EXCERPT_MID = 1500;
const EXCERPT_TAIL = 2000;
const EXCERPT_FULL_LIMIT = EXCERPT_HEAD + EXCERPT_MID + EXCERPT_TAIL; // <= this → send whole

/** Represent an example for the prompt: whole if short, else head+middle+tail. */
function excerptForPrompt(text: string): string {
  const t = (text ?? '').trim();
  if (t.length <= EXCERPT_FULL_LIMIT) return t;

  const head = t.slice(0, EXCERPT_HEAD);
  const midStart = Math.floor((t.length - EXCERPT_MID) / 2);
  const mid = t.slice(midStart, midStart + EXCERPT_MID);
  const tail = t.slice(t.length - EXCERPT_TAIL);
  return `${head}\n\n[… ara bölüm atlandı …]\n\n${mid}\n\n[… ara bölüm atlandı …]\n\n${tail}`;
}

type Row = Record<string, unknown>;

function asStringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = typeof val === 'string' ? val : '';
  }
  return out;
}

export const aiEngineService = {
  // ── DNA ────────────────────────────────────────────────────────────────
  async getActiveDna(): Promise<DnaDTO | null> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_dna')
      .select('id, version, sections, updated_at')
      .eq('is_active', true)
      .maybeSingle();
    if (!data) return null;
    const r = data as Row;
    return {
      id: r.id as string,
      version: r.version as number,
      sections: asStringMap(r.sections),
      updated_at: r.updated_at as string,
    };
  },

  /** Save DNA edits as a NEW active version; the old one is retired (kept for history). */
  async saveDna(sections: Record<string, string>, userId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: current } = await admin
      .from('ai_dna')
      .select('id, version')
      .eq('is_active', true)
      .maybeSingle();

    const nextVersion = ((current as Row | null)?.version as number ?? 0) + 1;

    if (current) {
      await admin.from('ai_dna').update({ is_active: false }).eq('id', (current as Row).id as string);
    }
    const { error } = await admin.from('ai_dna').insert({
      version: nextVersion,
      sections,
      is_active: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });
    return error ? { error: error.message } : {};
  },

  // ── Formats ────────────────────────────────────────────────────────────
  async getFormats(): Promise<FormatDTO[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_formats')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    return ((data ?? []) as Row[]).map((r) => ({
      id: r.id as string,
      key: r.key as string,
      label: r.label as string,
      sort_order: r.sort_order as number,
      is_active: r.is_active as boolean,
      version: r.version as number,
      playbook: asStringMap(r.playbook),
    }));
  },

  /** Update one format's playbook, bump its version, and snapshot it to history. */
  async saveFormatPlaybook(
    id: string,
    playbook: Record<string, string>,
    userId: string
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: cur } = await admin.from('ai_formats').select('version').eq('id', id).maybeSingle();
    const nextVersion = ((cur as Row | null)?.version as number ?? 0) + 1;
    const { error } = await admin
      .from('ai_formats')
      .update({ playbook, version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    // Snapshot so the old ruleset stays inspectable (like DNA versions).
    await admin.from('ai_format_versions').insert({
      format_id: id,
      version: nextVersion,
      playbook,
      updated_by: userId,
    });
    return {};
  },

  /** Full playbook history for one format, newest version first. */
  async getFormatVersions(formatId: string): Promise<
    { version: number; playbook: Record<string, string>; created_at: string }[]
  > {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_format_versions')
      .select('version, playbook, created_at')
      .eq('format_id', formatId)
      .order('version', { ascending: false });
    return ((data ?? []) as Row[]).map((r) => ({
      version: r.version as number,
      playbook: asStringMap(r.playbook),
      created_at: r.created_at as string,
    }));
  },

  // ── References ─────────────────────────────────────────────────────────
  async getReferences(): Promise<ReferenceDTO[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_references')
      .select('*, ai_formats(label)')
      .order('created_at', { ascending: false });
    return ((data ?? []) as Row[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      format_id: (r.format_id as string) ?? null,
      format_label: ((r.ai_formats as Row | null)?.label as string) ?? null,
      source_type: r.source_type as ReferenceDTO['source_type'],
      body: r.body as string,
      tags: (r.tags as string[]) ?? [],
      notes: (r.notes as string) ?? null,
      created_at: r.created_at as string,
    }));
  },

  async createReference(input: {
    title: string;
    formatId: string | null;
    sourceType: string;
    /** clean_content — the text the model will actually see. */
    body: string;
    /** original SRT/text, kept separately (null when identical to body). */
    rawContent: string | null;
    tags: string[];
    notes: string | null;
    userId: string;
  }): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ai_references').insert({
      title: input.title,
      format_id: input.formatId,
      source_type: input.sourceType,
      body: input.body,
      raw_content: input.rawContent,
      tags: input.tags,
      notes: input.notes,
      created_by: input.userId,
    });
    return error ? { error: error.message } : {};
  },

  async deleteReference(id: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ai_references').delete().eq('id', id);
    return error ? { error: error.message } : {};
  },

  // ── Scripts ────────────────────────────────────────────────────────────
  async listScripts(): Promise<ScriptDTO[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_scripts')
      .select('*, ai_formats(label)')
      .order('updated_at', { ascending: false });
    return ((data ?? []) as Row[]).map(rowToScript);
  },

  async getScript(id: string): Promise<ScriptDTO | null> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('ai_scripts')
      .select('*, ai_formats(label)')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const script = rowToScript(data as Row);

    const { data: gens } = await admin
      .from('ai_generations')
      .select('*')
      .eq('script_id', id)
      .order('created_at', { ascending: false });
    script.generations = ((gens ?? []) as Row[]).map(rowToGeneration);
    return script;
  },

  async createScript(input: {
    title: string;
    topic: string | null;
    formatId: string | null;
    platform: string | null;
    targetDuration: string | null;
    draftText: string | null;
    sourceFacts: string | null;
    userId: string;
  }): Promise<{ id?: string; error?: string }> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('ai_scripts')
      .insert({
        title: input.title,
        topic: input.topic,
        format_id: input.formatId,
        platform: input.platform,
        target_duration: input.targetDuration,
        draft_text: input.draftText,
        source_facts: input.sourceFacts,
        status: 'DRAFT',
        created_by: input.userId,
      })
      .select('id')
      .single();
    if (error) return { error: error.message };
    return { id: (data as Row).id as string };
  },

  async updateScript(id: string, patch: {
    title?: string;
    topic?: string | null;
    formatId?: string | null;
    platform?: string | null;
    targetDuration?: string | null;
    draftText?: string | null;
    sourceFacts?: string | null;
  }): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const payload: Row = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.topic !== undefined) payload.topic = patch.topic;
    if (patch.formatId !== undefined) payload.format_id = patch.formatId;
    if (patch.platform !== undefined) payload.platform = patch.platform;
    if (patch.targetDuration !== undefined) payload.target_duration = patch.targetDuration;
    if (patch.draftText !== undefined) payload.draft_text = patch.draftText;
    if (patch.sourceFacts !== undefined) payload.source_facts = patch.sourceFacts;
    const { error } = await admin.from('ai_scripts').update(payload).eq('id', id);
    return error ? { error: error.message } : {};
  },

  async deleteScript(id: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('ai_scripts').delete().eq('id', id);
    return error ? { error: error.message } : {};
  },

  /** Approve a final text (gold standard). Optionally record which generation it came from. */
  async approveFinal(
    id: string,
    finalText: string,
    generationId: string | null,
    userId: string
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin
      .from('ai_scripts')
      .update({
        final_text: finalText,
        final_generation_id: generationId,
        status: 'FINAL',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    return error ? { error: error.message } : {};
  },

  /** Reopen a FINAL script for further editing (keeps final_text as-is). */
  async reopen(id: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin
      .from('ai_scripts')
      .update({ status: 'AI_EDITED', updated_at: new Date().toISOString() })
      .eq('id', id);
    return error ? { error: error.message } : {};
  },

  // ── Generations ──────────────────────────────────────────────────────────
  async recordGeneration(input: {
    scriptId: string;
    outputText: string;
    aiNotes: string[];
    dnaVersion: number | null;
    formatVersion: number | null;
    promptVersion: string;
    model: string;
    referenceIds: string[];
    goldStandardScriptIds: string[];
    userId: string;
  }): Promise<{ id?: string; error?: string }> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('ai_generations')
      .insert({
        script_id: input.scriptId,
        output_text: input.outputText,
        ai_notes: input.aiNotes,
        dna_version: input.dnaVersion,
        format_version: input.formatVersion,
        prompt_version: input.promptVersion,
        model: input.model,
        reference_ids: input.referenceIds,
        gold_standard_script_ids: input.goldStandardScriptIds,
        created_by: input.userId,
      })
      .select('id')
      .single();
    if (error) return { error: error.message };
    // Move the script into AI_EDITED once it has at least one generation.
    await admin
      .from('ai_scripts')
      .update({ status: 'AI_EDITED', updated_at: new Date().toISOString() })
      .eq('id', input.scriptId)
      .eq('status', 'DRAFT');
    return { id: (data as Row).id as string };
  },

  /**
   * Gather the grounding a generation needs: active DNA, the chosen format's
   * playbook, a few gold-standard finals of the same format, and a few
   * reference examples of the same format. Kept small on purpose.
   */
  async buildContext(formatId: string | null): Promise<{
    dna: DnaDTO | null;
    format: FormatDTO | null;
    golds: { id: string; title: string; text: string }[];
    references: { id: string; title: string; text: string }[];
  }> {
    const admin = createAdminClient();
    const dna = await this.getActiveDna();

    let format: FormatDTO | null = null;
    if (formatId) {
      const formats = await this.getFormats();
      format = formats.find((f) => f.id === formatId) ?? null;
    }

    const goldsQuery = admin
      .from('ai_scripts')
      .select('id, title, final_text')
      .eq('status', 'FINAL')
      .not('final_text', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(MAX_GOLD_EXAMPLES);
    if (formatId) goldsQuery.eq('format_id', formatId);
    const { data: goldRows } = await goldsQuery;
    const golds = ((goldRows ?? []) as Row[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      text: excerptForPrompt(String(r.final_text ?? '')),
    }));

    const refQuery = admin
      .from('ai_references')
      .select('id, title, body')
      .order('created_at', { ascending: false })
      .limit(MAX_REFERENCE_EXAMPLES);
    if (formatId) refQuery.eq('format_id', formatId);
    const { data: refRows } = await refQuery;
    const references = ((refRows ?? []) as Row[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      text: excerptForPrompt(String(r.body ?? '')),
    }));

    return { dna, format, golds, references };
  },
};

function rowToScript(r: Row): ScriptDTO {
  return {
    id: r.id as string,
    title: r.title as string,
    topic: (r.topic as string) ?? null,
    format_id: (r.format_id as string) ?? null,
    format_label: ((r.ai_formats as Row | null)?.label as string) ?? null,
    platform: (r.platform as ScriptDTO['platform']) ?? null,
    target_duration: (r.target_duration as string) ?? null,
    status: r.status as ScriptStatus,
    draft_text: (r.draft_text as string) ?? null,
    source_facts: (r.source_facts as string) ?? null,
    final_text: (r.final_text as string) ?? null,
    final_generation_id: (r.final_generation_id as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowToGeneration(r: Row): GenerationDTO {
  const notes = r.ai_notes;
  return {
    id: r.id as string,
    script_id: r.script_id as string,
    output_text: r.output_text as string,
    ai_notes: Array.isArray(notes) ? (notes as string[]) : [],
    dna_version: (r.dna_version as number) ?? null,
    format_version: (r.format_version as number) ?? null,
    prompt_version: (r.prompt_version as string) ?? null,
    model: (r.model as string) ?? null,
    reference_ids: (r.reference_ids as string[]) ?? [],
    gold_standard_script_ids: (r.gold_standard_script_ids as string[]) ?? [],
    created_at: r.created_at as string,
  };
}
