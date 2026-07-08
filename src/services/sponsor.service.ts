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
  SponsorPayment,
  SponsorStatus,
  SponsorFileCategory,
  PaymentType,
} from '@/app/(dashboard)/sponsorluklar/sponsor.constants';
import { SPONSOR_INCOME_CATEGORY } from '@/app/(dashboard)/sponsorluklar/sponsor.constants';

export type { Sponsor, SponsorFile, SponsorPayment, SponsorStatus, SponsorFileCategory, PaymentType };

const BUCKET = 'sponsors';
const SIGNED_TTL = 3600; // 1h

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export interface SponsorInput {
  name: string;
  status?: SponsorStatus;
  start_date?: string | null;
  end_date?: string | null;
  terms?: string | null;
  notes?: string | null;
  contact?: string | null;
  deal_value?: number | null;
  payment_type?: PaymentType;
  monthly_amount?: number | null;
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

  async signedUrl(path: string | null, downloadName?: string): Promise<string | null> {
    if (!path) return null;
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL, downloadName ? { download: downloadName } : undefined);
    return data?.signedUrl ?? null;
  },

  /**
   * A short-lived signed URL the browser can PUT a file to directly,
   * bypassing server-action / serverless body-size limits.
   */
  async createUploadUrl(
    sponsorId: string,
    category: SponsorFileCategory,
    fileName: string
  ): Promise<{ path?: string; token?: string; error?: string }> {
    const admin = createAdminClient();
    const path = `${sponsorId}/${category}/${Date.now()}-${slug(fileName)}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? 'Yükleme adresi alınamadı' };
    return { path: data.path, token: data.token };
  },

  /** Record a file row after a successful direct upload. */
  async recordFile(
    sponsorId: string,
    category: SponsorFileCategory,
    fileName: string,
    path: string,
    sizeBytes: number
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('sponsor_files').insert({
      sponsor_id: sponsorId,
      category,
      file_name: fileName,
      file_path: path,
      size_bytes: sizeBytes,
    });
    return error ? { error: error.message } : {};
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

  async deleteFile(fileId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: f } = await admin.from('sponsor_files').select('file_path').eq('id', fileId).maybeSingle();
    if (f?.file_path) {
      await admin.storage.from(BUCKET).remove([f.file_path]);
    }
    const { error } = await admin.from('sponsor_files').delete().eq('id', fileId);
    return error ? { error: error.message } : {};
  },

  // ── Payment schedule ─────────────────────────────────────────────

  async getPayments(sponsorId: string): Promise<SponsorPayment[]> {
    const admin = createAdminClient();
    const { data } = await admin
      .from('sponsor_payments')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    return (data as SponsorPayment[]) ?? [];
  },

  /**
   * Build a monthly installment schedule from the sponsor's date range and
   * monthly_amount. One row per calendar month in [start_date, end_date].
   * Skips generation if installments already exist (no duplicates).
   */
  async generateSchedule(sponsorId: string): Promise<{ error?: string; count?: number }> {
    const admin = createAdminClient();
    const sponsor = await this.getById(sponsorId);
    if (!sponsor) return { error: 'Sponsor bulunamadı' };
    if (sponsor.payment_type !== 'MONTHLY') return { error: 'Ödeme tipi aylık değil' };
    if (!sponsor.monthly_amount || sponsor.monthly_amount <= 0) return { error: 'Aylık tutar girilmemiş' };
    if (!sponsor.start_date || !sponsor.end_date) return { error: 'Başlangıç ve bitiş tarihi gerekli' };

    const existing = await this.getPayments(sponsorId);
    if (existing.length > 0) return { error: 'Ödeme planı zaten mevcut' };

    let [y, m] = sponsor.start_date.split('-').map(Number); // m is 1-12
    const [ey, em] = sponsor.end_date.split('-').map(Number);
    const rows: Array<{ sponsor_id: string; label: string; amount: number; due_date: string; is_paid: boolean }> = [];
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard < 120) {
      rows.push({
        sponsor_id: sponsorId,
        label: `${MONTHS_TR[m - 1]} ${y}`,
        amount: sponsor.monthly_amount,
        due_date: `${y}-${String(m).padStart(2, '0')}-01`,
        is_paid: false,
      });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
      guard += 1;
    }
    if (rows.length === 0) return { error: 'Tarih aralığı geçersiz' };

    const { error } = await admin.from('sponsor_payments').insert(rows);
    return error ? { error: error.message } : { count: rows.length };
  },

  async addPayment(
    sponsorId: string,
    input: { label: string; amount: number; due_date: string | null }
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin.from('sponsor_payments').insert({
      sponsor_id: sponsorId,
      label: input.label,
      amount: input.amount,
      due_date: input.due_date,
      is_paid: false,
    });
    return error ? { error: error.message } : {};
  },

  /**
   * Edit an installment's label / amount / due date. If it is already paid,
   * the linked INCOME transaction is kept in sync (amount + description).
   */
  async updatePayment(
    paymentId: string,
    input: { label: string; amount: number; due_date: string | null }
  ): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from('sponsor_payments')
      .select('id, sponsor_id, is_paid, transaction_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (!p) return { error: 'Ödeme bulunamadı' };

    const { error } = await admin
      .from('sponsor_payments')
      .update({ label: input.label, amount: input.amount, due_date: input.due_date })
      .eq('id', paymentId);
    if (error) return { error: error.message };

    // keep the finance income in sync when already paid
    if (p.is_paid && p.transaction_id) {
      const sponsor = await this.getById(p.sponsor_id);
      await admin
        .from('transactions')
        .update({
          amount: input.amount,
          description: `Sponsorluk: ${sponsor?.name ?? ''} — ${input.label}`.trim(),
        })
        .eq('id', p.transaction_id);
    }
    return {};
  },

  /**
   * Mark an installment paid → create a linked INCOME transaction (SPONSORLUK).
   * Idempotent: if already paid, does nothing.
   */
  async markPaid(paymentId: string, paidDate: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from('sponsor_payments')
      .select('id, sponsor_id, label, amount, is_paid, transaction_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (!p) return { error: 'Ödeme bulunamadı' };
    if (p.is_paid) return {};

    const sponsor = await this.getById(p.sponsor_id);
    const desc = `Sponsorluk: ${sponsor?.name ?? ''} — ${p.label}`.trim();

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .insert({
        type: 'INCOME',
        category: SPONSOR_INCOME_CATEGORY,
        amount: p.amount,
        description: desc,
        transaction_date: paidDate,
      })
      .select('id')
      .single();
    if (txError) return { error: txError.message };

    const { error } = await admin
      .from('sponsor_payments')
      .update({ is_paid: true, paid_date: paidDate, transaction_id: tx.id })
      .eq('id', paymentId);
    if (error) {
      // roll back the orphan transaction
      await admin.from('transactions').delete().eq('id', tx.id);
      return { error: error.message };
    }
    return {};
  },

  /** Mark an installment unpaid → remove the linked INCOME transaction. */
  async markUnpaid(paymentId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from('sponsor_payments')
      .select('id, transaction_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (!p) return { error: 'Ödeme bulunamadı' };
    if (p.transaction_id) {
      await admin.from('transactions').delete().eq('id', p.transaction_id);
    }
    const { error } = await admin
      .from('sponsor_payments')
      .update({ is_paid: false, paid_date: null, transaction_id: null })
      .eq('id', paymentId);
    return error ? { error: error.message } : {};
  },

  async deletePayment(paymentId: string): Promise<{ error?: string }> {
    const admin = createAdminClient();
    // remove the linked income transaction first, if any
    const { data: p } = await admin
      .from('sponsor_payments')
      .select('transaction_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (p?.transaction_id) {
      await admin.from('transactions').delete().eq('id', p.transaction_id);
    }
    const { error } = await admin.from('sponsor_payments').delete().eq('id', paymentId);
    return error ? { error: error.message } : {};
  },
};
