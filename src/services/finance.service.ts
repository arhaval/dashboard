/**
 * Finance Service
 * Handles all financial transaction operations
 */

import { createClient } from '@/lib/supabase/server';
import type { Transaction, TransactionFilters, TransactionType, CreateTransactionInput } from '@/types';

/** Get current month in YYYY-MM format */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Get the first day of the next month (for date range queries) */
function getNextMonthStart(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

export { getCurrentMonth, getNextMonthStart };

export const financeService = {
  /**
   * Get all transactions with optional filters
   * Admin only (enforced by RLS)
   */
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const supabase = await createClient();

    let query = supabase
      .from('transactions')
      .select('*, user:users(id, full_name, email), payment:payments(id, user_id, user:users(full_name))')
      .order('transaction_date', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.date_from) {
      query = query.gte('transaction_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('transaction_date', filters.date_to);
    }

    if (filters?.date_before) {
      query = query.lt('transaction_date', filters.date_before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get transaction by ID
   */
  async getById(id: string): Promise<Transaction | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('*, user:users(id, full_name, email), payment:payments(id, user_id, user:users(full_name))')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Create a manual transaction (income or expense)
   */
  async create(input: CreateTransactionInput): Promise<Transaction | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: input.type,
        category: input.category,
        amount: input.amount,
        description: input.description || null,
        transaction_date: input.transaction_date,
        user_id: input.user_id || null,
      })
      .select('*, user:users(id, full_name, email)')
      .single();

    if (error) {
      console.error('Error creating transaction:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Get financial summary stats
   */
  async getStats(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase.from('transactions').select('type, amount');

    if (error || !data) {
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 };
    }

    const totalIncome = data
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = data
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: data.length,
    };
  },

  /**
   * Get unique categories for filtering
   */
  async getCategories(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('category')
      .order('category');

    if (error || !data) {
      return [];
    }

    // Get unique categories
    const categories = [...new Set(data.map((t) => t.category))];
    return categories;
  },

  /**
   * Get transactions for a specific user
   * Used for team member profile pages
   */
  async getByUserId(userId: string): Promise<Transaction[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('*, user:users(id, full_name, email), payment:payments(id, user_id, user:users(full_name))')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching user transactions:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get user stats summary
   * Total income/expenses for a specific user
   */
  async getUserStats(userId: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId);

    if (error || !data) {
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 };
    }

    const totalIncome = data
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = data
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: data.length,
    };
  },

  /**
   * Get financial stats for a specific month (YYYY-MM)
   */
  async getStatsByMonth(month: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('transaction_date', `${month}-01`)
      .lt('transaction_date', getNextMonthStart(month));

    if (error || !data) {
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 };
    }

    const totalIncome = data
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = data
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: data.length,
    };
  },

  /**
   * Get all months that have transaction data (YYYY-MM format, descending)
   */
  async getAvailableMonths(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date')
      .order('transaction_date', { ascending: false });

    if (error || !data) return [getCurrentMonth()];

    const months = new Set<string>();
    for (const t of data) {
      const d = new Date(t.transaction_date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    // Always include current month
    months.add(getCurrentMonth());

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  },
};
