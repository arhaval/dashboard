/**
 * Cash Flow Service
 * Beklenen gelir/gider ve projeksiyon hesaplamaları
 */

import { createClient } from '@/lib/supabase/server';

// ── Tipler ──────────────────────────────────────────────────────────────────

export type IncomeStatus  = 'BEKLEMEDE' | 'TAHSIL_EDILDI' | 'IPTAL_EDILDI';
export type ExpenseStatus = 'BEKLEMEDE' | 'ODENDI'        | 'IPTAL_EDILDI';
export type IncomeCategory = 'SPONSORLUK' | 'REKLAM' | 'TURNUVA' | 'DIGER';

export interface ExpectedIncome {
  id: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  status: IncomeStatus;
  expected_date: string;
  notes: string | null;
  received_at: string | null;
  created_at: string;
}

export interface ExpectedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: ExpenseStatus;
  due_date: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface MonthlyPoint {
  month: string;  // "2026-06"
  label: string;  // "Haz 2026"
  income: number;
  expense: number;
  net: number;
}

export interface CashFlowSummary {
  totalExpectedIncome: number;
  totalExpectedExpense: number;
  projectedBalance: number;
  pendingIncomes: ExpectedIncome[];
  pendingExpenses: ExpectedExpense[];
  monthlyProjection: MonthlyPoint[];
  currentMonthIncome: number;
  currentMonthExpense: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const cashFlowService = {
  async getSummary(): Promise<CashFlowSummary> {
    const supabase = await createClient();

    const [incomeRes, expenseRes, txRes] = await Promise.all([
      supabase
        .from('expected_income')
        .select('*')
        .eq('status', 'BEKLEMEDE')
        .order('expected_date', { ascending: true }),
      supabase
        .from('expected_expense')
        .select('*')
        .eq('status', 'BEKLEMEDE')
        .order('due_date', { ascending: true }),
      supabase
        .from('transactions')
        .select('type, amount, transaction_date')
        .gte('transaction_date', currentMonthStart())
        .lte('transaction_date', currentMonthEnd()),
    ]);

    const incomes  = (incomeRes.data  ?? []) as ExpectedIncome[];
    const expenses = (expenseRes.data ?? []) as ExpectedExpense[];
    const txs      = txRes.data ?? [];

    const totalExpectedIncome  = incomes.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpectedExpense = expenses.reduce((s, r) => s + Number(r.amount), 0);
    const projectedBalance     = totalExpectedIncome - totalExpectedExpense;

    const currentMonthIncome  = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const currentMonthExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

    const monthlyProjection = buildProjection(incomes, expenses, 6);

    return {
      totalExpectedIncome,
      totalExpectedExpense,
      projectedBalance,
      pendingIncomes: incomes,
      pendingExpenses: expenses,
      monthlyProjection,
      currentMonthIncome,
      currentMonthExpense,
    };
  },

  async createIncome(data: {
    title: string;
    amount: number;
    category: IncomeCategory;
    expected_date: string;
    notes?: string;
  }): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.from('expected_income').insert(data);
    return { error: error?.message ?? null };
  },

  async createExpense(data: {
    title: string;
    amount: number;
    category: string;
    due_date: string;
    notes?: string;
  }): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.from('expected_expense').insert(data);
    return { error: error?.message ?? null };
  },

  async markIncomeReceived(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient();

    // 1. Kaydı çek
    const { data: income, error: fetchErr } = await supabase
      .from('expected_income')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !income) return { error: fetchErr?.message ?? 'Kayıt bulunamadı' };

    // 2. ExpectedIncome → TAHSIL_EDILDI
    const { error: updateErr } = await supabase
      .from('expected_income')
      .update({ status: 'TAHSIL_EDILDI', received_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) return { error: updateErr.message };

    // 3. Ana transactions defterine INCOME satırı yaz
    const { error: txErr } = await supabase.from('transactions').insert({
      type: 'INCOME',
      category: income.category ?? 'Gelir Tahmini',
      amount: income.amount,
      description: `[Tahmin → Tahsil] ${income.title}${income.notes ? ' · ' + income.notes : ''}`,
      transaction_date: new Date().toISOString().split('T')[0],
    });

    if (txErr) return { error: txErr.message };
    return { error: null };
  },

  async markExpensePaid(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { data: expense, error: fetchErr } = await supabase
      .from('expected_expense')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !expense) return { error: fetchErr?.message ?? 'Kayıt bulunamadı' };

    const { error: updateErr } = await supabase
      .from('expected_expense')
      .update({ status: 'ODENDI', paid_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) return { error: updateErr.message };

    const { error: txErr } = await supabase.from('transactions').insert({
      type: 'EXPENSE',
      category: expense.category ?? 'Gider Tahmini',
      amount: expense.amount,
      description: `[Tahmin → Ödendi] ${expense.title}${expense.notes ? ' · ' + expense.notes : ''}`,
      transaction_date: new Date().toISOString().split('T')[0],
    });

    if (txErr) return { error: txErr.message };
    return { error: null };
  },

  async cancelIncome(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('expected_income')
      .update({ status: 'IPTAL_EDILDI' })
      .eq('id', id);
    return { error: error?.message ?? null };
  },

  async cancelExpense(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('expected_expense')
      .update({ status: 'IPTAL_EDILDI' })
      .eq('id', id);
    return { error: error?.message ?? null };
  },
};

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-06-15" → "2026-06"
}

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function currentMonthEnd(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().split('T')[0];
}

function buildProjection(
  incomes: ExpectedIncome[],
  expenses: ExpectedExpense[],
  months: number,
): MonthlyPoint[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });

    const income  = incomes.filter((r) => monthKey(r.expected_date) === key).reduce((s, r) => s + Number(r.amount), 0);
    const expense = expenses.filter((r) => monthKey(r.due_date) === key).reduce((s, r) => s + Number(r.amount), 0);

    return { month: key, label, income, expense, net: income - expense };
  });
}
