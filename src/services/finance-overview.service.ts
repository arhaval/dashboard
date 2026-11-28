/**
 * Finans Genel Bakış — yöneticinin üç sorusunun tek kaynağı (admin-only):
 *
 *   1. Kâr/zarar   — ay, önceki ay, yıl başından beri; kategori kırılımı
 *   2. Borçlarımız — ekibe ödenmemiş hak edişler (kişi bazında) + planlı giderler
 *   3. Alacaklarımız — dış ortak (Sangal…) ay bazlı alacak, sponsor taksitleri,
 *                     beklenen gelirler
 *
 * Kural: "gerçekleşen" rakamlar yalnızca transactions defterinden gelir;
 * borç/alacak ise henüz deftere girmemiş yükümlülüklerdir. Böylece kâr/zarar
 * ile borç/alacak birbirini çift saymaz.
 *
 * Dış ortak alacağı, müşteriye gönderilen raporla (ekstra-isler/[id]) aynı
 * kuralla hesaplanır: o ayın TÜM işlerinin bill_amount toplamı.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EXTERNAL_WORK_INCOME_CATEGORY } from '@/constants';
import { todayTR } from '@/lib/utils/dates';

// ── Tipler ──────────────────────────────────────────────────────────────────

export interface PnlTotals {
  income: number;
  expense: number;
  net: number;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface PnlSummary {
  month: string;
  current: PnlTotals;
  previous: PnlTotals;
  /** Yıl başından seçili ayın sonuna kadar. */
  ytd: PnlTotals;
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
}

export interface PersonPayable {
  userId: string;
  name: string;
  /** Onaylı, ödemesi yapılmamış (ödemeye hazır). */
  ready: number;
  readyCount: number;
  /** Taslak + ücretli (onay bekliyor). */
  awaiting: number;
  awaitingCount: number;
  /** Taslak + ücreti belirlenmemiş. */
  unpricedCount: number;
}

export interface PlannedExpense {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
}

export interface Payables {
  people: PersonPayable[];
  totalReady: number;
  totalAwaiting: number;
  totalUnpriced: number;
  planned: PlannedExpense[];
  totalPlanned: number;
}

export interface ClientReceivable {
  clientId: string;
  clientName: string;
  month: string;
  billed: number;
  collected: number;
  outstanding: number;
  itemCount: number;
}

export interface SponsorDue {
  id: string;
  sponsorId: string;
  sponsorName: string;
  label: string;
  amount: number;
  dueDate: string | null;
  overdue: boolean;
}

export interface ExpectedIncomeRow {
  id: string;
  title: string;
  amount: number;
  expectedDate: string;
  overdue: boolean;
}

export interface Receivables {
  clients: ClientReceivable[];
  totalClients: number;
  sponsors: SponsorDue[];
  totalSponsors: number;
  expected: ExpectedIncomeRow[];
  totalExpected: number;
  /** client_collections tablosu henüz yoksa (migration uygulanmadı) false. */
  collectionsReady: boolean;
}

/** Sponsor taksidi bu kadar gün içinde vadesi geliyorsa "yaklaşan" sayılır. */
const SPONSOR_LOOKAHEAD_DAYS = 30;

// ── Yardımcılar ─────────────────────────────────────────────────────────────

const num = (v: unknown) => Number(v ?? 0);

function monthRange(month: string): { from: string; before: string } {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from: `${month}-01`, before: `${next}-01` };
}

export function previousMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function totals(rows: { type: string; amount: unknown }[]): PnlTotals {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === 'INCOME') income += num(r.amount);
    else expense += num(r.amount);
  }
  return { income, expense, net: income - expense };
}

function byCategory(rows: { type: string; category: string; amount: unknown }[], type: string): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== type) continue;
    map.set(r.category, (map.get(r.category) ?? 0) + num(r.amount));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ── Servis ──────────────────────────────────────────────────────────────────

export const financeOverviewService = {
  /** Kâr/zarar: seçili ay, önceki ay, yıl başından beri. */
  async getPnl(month: string): Promise<PnlSummary> {
    const supabase = await createClient();
    const prev = previousMonthOf(month);
    const yearStart = `${month.slice(0, 4)}-01-01`;
    const { before } = monthRange(month);
    // Önceki ay Ocak'ta geçen yıla düşebilir → aralığın başı ikisinin küçüğü.
    const from = monthRange(prev).from < yearStart ? monthRange(prev).from : yearStart;

    const { data } = await supabase
      .from('transactions')
      .select('type, category, amount, transaction_date')
      .gte('transaction_date', from)
      .lt('transaction_date', before);

    const rows = (data ?? []) as { type: string; category: string; amount: number; transaction_date: string }[];
    const inMonth = (m: string) => rows.filter((r) => r.transaction_date.startsWith(m));
    const current = inMonth(month);

    return {
      month,
      current: totals(current),
      previous: totals(inMonth(prev)),
      ytd: totals(rows.filter((r) => r.transaction_date >= yearStart)),
      incomeByCategory: byCategory(current, 'INCOME'),
      expenseByCategory: byCategory(current, 'EXPENSE'),
    };
  },

  /** Ekibe borçlar (kişi bazında) + planlı giderler. */
  async getPayables(): Promise<Payables> {
    const supabase = await createClient();
    const [workRes, expRes] = await Promise.all([
      supabase
        .from('work_items')
        .select('user_id, status, cost, user:users(full_name)')
        .in('status', ['DRAFT', 'APPROVED']),
      supabase
        .from('expected_expense')
        .select('id, title, amount, due_date')
        .eq('status', 'BEKLEMEDE')
        .order('due_date', { ascending: true }),
    ]);

    type WorkRow = { user_id: string; status: string; cost: number | null; user: { full_name: string } | null };
    const map = new Map<string, PersonPayable>();
    for (const w of (workRes.data ?? []) as unknown as WorkRow[]) {
      const p = map.get(w.user_id) ?? {
        userId: w.user_id,
        name: w.user?.full_name ?? 'Bilinmiyor',
        ready: 0, readyCount: 0, awaiting: 0, awaitingCount: 0, unpricedCount: 0,
      };
      if (w.status === 'APPROVED') {
        p.ready += num(w.cost);
        p.readyCount += 1;
      } else if (w.cost == null) {
        p.unpricedCount += 1;
      } else {
        p.awaiting += num(w.cost);
        p.awaitingCount += 1;
      }
      map.set(w.user_id, p);
    }

    const people = [...map.values()].sort((a, b) => b.ready + b.awaiting - (a.ready + a.awaiting));
    const planned = ((expRes.data ?? []) as { id: string; title: string; amount: number; due_date: string }[]).map((e) => ({
      id: e.id, title: e.title, amount: num(e.amount), dueDate: e.due_date,
    }));

    return {
      people,
      totalReady: people.reduce((s, p) => s + p.ready, 0),
      totalAwaiting: people.reduce((s, p) => s + p.awaiting, 0),
      totalUnpriced: people.reduce((s, p) => s + p.unpricedCount, 0),
      planned,
      totalPlanned: planned.reduce((s, e) => s + e.amount, 0),
    };
  },

  /** Bize olan borçlar: dış ortak ayları, sponsor taksitleri, beklenen gelir. */
  async getReceivables(): Promise<Receivables> {
    const supabase = await createClient();
    // sponsor_payments'ta RLS açık ama politika yok (sponsor modülü de servis
    // anahtarıyla okur). Bu servis yalnızca admin sayfasından çağrılır.
    const admin = createAdminClient();
    const today = todayTR();

    const [workRes, collRes, sponsorRes, expRes] = await Promise.all([
      supabase
        .from('work_items')
        .select('client_id, work_date, bill_amount, client:clients(name, is_internal)')
        .not('bill_amount', 'is', null),
      supabase.from('client_collections').select('client_id, month, amount'),
      admin
        .from('sponsor_payments')
        .select('id, sponsor_id, label, amount, due_date, sponsor:sponsors(name)')
        .eq('is_paid', false)
        .order('due_date', { ascending: true }),
      supabase
        .from('expected_income')
        .select('id, title, amount, expected_date')
        .eq('status', 'BEKLEMEDE')
        .order('expected_date', { ascending: true }),
    ]);

    // Dış ortak: (müşteri, ay) → faturalanan
    type WorkRow = { client_id: string; work_date: string; bill_amount: number; client: { name: string; is_internal: boolean } | null };
    const billed = new Map<string, ClientReceivable>();
    for (const w of (workRes.data ?? []) as unknown as WorkRow[]) {
      if (!w.client || w.client.is_internal) continue;
      const month = w.work_date.slice(0, 7);
      const key = `${w.client_id}|${month}`;
      const r = billed.get(key) ?? {
        clientId: w.client_id, clientName: w.client.name, month,
        billed: 0, collected: 0, outstanding: 0, itemCount: 0,
      };
      r.billed += num(w.bill_amount);
      r.itemCount += 1;
      billed.set(key, r);
    }
    const collectionsReady = !collRes.error;
    for (const c of (collRes.data ?? []) as { client_id: string; month: string; amount: number }[]) {
      const r = billed.get(`${c.client_id}|${c.month}`);
      if (r) r.collected += num(c.amount);
    }
    const clients = [...billed.values()]
      .map((r) => ({ ...r, outstanding: Math.max(r.billed - r.collected, 0) }))
      .filter((r) => r.outstanding > 0)
      .sort((a, b) => a.month.localeCompare(b.month));

    // Sponsor: vadesi geçmiş veya yaklaşan ödenmemiş taksitler
    const horizon = addDays(today, SPONSOR_LOOKAHEAD_DAYS);
    type SponsorRow = { id: string; sponsor_id: string; label: string; amount: number; due_date: string | null; sponsor: { name: string } | null };
    const sponsors = ((sponsorRes.data ?? []) as unknown as SponsorRow[])
      .filter((p) => !p.due_date || p.due_date <= horizon)
      .map((p) => ({
        id: p.id, sponsorId: p.sponsor_id, sponsorName: p.sponsor?.name ?? 'Sponsor',
        label: p.label, amount: num(p.amount), dueDate: p.due_date,
        overdue: !!p.due_date && p.due_date < today,
      }));

    const expected = ((expRes.data ?? []) as { id: string; title: string; amount: number; expected_date: string }[]).map((e) => ({
      id: e.id, title: e.title, amount: num(e.amount), expectedDate: e.expected_date,
      overdue: e.expected_date < today,
    }));

    return {
      clients,
      totalClients: clients.reduce((s, c) => s + c.outstanding, 0),
      sponsors,
      totalSponsors: sponsors.reduce((s, p) => s + p.amount, 0),
      expected,
      totalExpected: expected.reduce((s, e) => s + e.amount, 0),
      collectionsReady,
    };
  },

  /**
   * Dış ortağın bir ayını tahsil et: INCOME transaction ('Ekstra İşler') +
   * client_collections kaydı. Kayıt başarısızsa açık kalan transaction silinir.
   */
  async collectClientMonth(input: {
    clientId: string;
    month: string;
    amount: number;
    collectedOn: string;
    createdBy: string;
  }): Promise<{ error?: string }> {
    const admin = createAdminClient();

    const { data: client } = await admin
      .from('clients')
      .select('name, is_internal')
      .eq('id', input.clientId)
      .single();
    if (!client || client.is_internal) return { error: 'Dış ortak bulunamadı.' };

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .insert({
        type: 'INCOME',
        category: EXTERNAL_WORK_INCOME_CATEGORY,
        amount: input.amount,
        description: `${client.name} — ${input.month} işleri tahsilatı`,
        transaction_date: input.collectedOn,
      })
      .select('id')
      .single();
    if (txErr || !tx) return { error: txErr?.message ?? 'Gelir kaydı oluşturulamadı.' };

    const { error } = await admin.from('client_collections').insert({
      client_id: input.clientId,
      month: input.month,
      amount: input.amount,
      collected_on: input.collectedOn,
      transaction_id: tx.id,
      created_by: input.createdBy,
    });
    if (error) {
      await admin.from('transactions').delete().eq('id', tx.id);
      return { error: error.message };
    }
    return {};
  },
};
