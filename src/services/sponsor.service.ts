/**
 * Sponsor service. All access via the service-role admin client — the
 * Sponsorluklar pages/actions are admin-gated, so RLS blocks everyone else.
 * Files (logo, contract, logo pack) live in the private "sponsors" bucket;
 * access is via short-lived signed URLs.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Sponsor,
  SponsorFile,
  SponsorStatus,
  SponsorFileCategory,
} from '@/app/(dashboard)/sponsorluklar/sponsor.constants';

export type { Sponsor, SponsorFile, SponsorStatus, SponsorFileCategory };

const BUCKET = 'sponsors';
const SIGNED_TTL = 3600; // 1h

export interface SponsorInput {
  name: string;
  status?: SponsorStatus;
  start_date?: string | null;
  end_date?: string | null;
  terms?: string | null;
  notes?: string | null;
  contact?: string | null;
  deal_value?: number | null;
}

function slug(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]+/g, '-').slice(0, 60);
}

export const sponsorService = {
  async getAll(): Promise<Sponsor[]> {
    const admin = createAdminClient();
    const { data } = await admin.from('sponsors').select('*').order('created_at', { ascending: false });
    return (data as Sponsor[]) ?? [];
  },

  async getById(id: string): Promise<Sponsor | null> {
    const admin = createAdminClient();
    const { data } = await admin.from('sponsors').select('*').eq('id', id).maybeSingle();
    return (data as Sponsor) ?? null;
  },

  async signedUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const admin = createAdminClient();
    const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
    return data?.signedUrl ?? null;
  },

  async getFiles(sponsorId: string): Promise<SponsorFile[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('sponsor_files')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('created_at', { ascending: false });
    return (data as SponsorFile[]) ?? [];
  },

  async create(input: SponsorInput): Promise<{ id?: string; error?: string }> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('sponsors')
      .insert({ ...input, status: input.status ?? 'ACTIVE' })
      .select('id')
      .single();
    if (error) return { error: error.message };
    return { id: data.id };
  },

  async update(id: string, input: Partial<SponsorInput>): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin
      .from('sponsors')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    return error ? { error: error.message } : {};
  },

  async delete(id: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    // best-effort remove storage folder
    try {
      const { data: files } = await admin.storage.from(BUCKET).list(id);
      if (files?.length) {
        await admin.storage.from(BUCKET).remove(files.map((f) => `${id}/${f.name}`));
      }
    } catch {
      /* ignore */
    }
    const { error } = await admin.from('sponsors').delete().eq('id', id);
    return error ? { error: error.message } : {};
  },

  async uploadLogo(sponsorId: string, file: File): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const path = `${sponsorId}/logo-${slug(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || 'image/png', upsert: true });
    if (error) return { error: error.message };
    await admin.from('sponsors').update({ logo_path: path }).eq('id', sponsorId);
    return {};
  },

  async uploadFile(
    sponsorId: string,
    category: SponsorFileCategory,
    file: File
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const path = `${sponsorId}/${category}/${Date.now()}-${slug(file.name)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream' });
    if (error) return { error: error.message };
    const { error: dbError } = await admin.from('sponsor_files').insert({
      sponsor_id: sponsorId,
      category,
      file_name: file.name,
      file_path: path,
      size_bytes: file.size,
    });
    return dbError ? { error: dbError.message } : {};
  },

  async deleteFile(fileId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: f } = await admin.from('sponsor_files').select('file_path').eq('id', fileId).maybeSingle();
    if (f?.file_path) {
      await admin.storage.from(BUCKET).remove([f.file_path]);
    }
    const { error } = await admin.from('sponsor_files').delete().eq('id', fileId);
    return error ? { error: error.message } : {};
  },
};
