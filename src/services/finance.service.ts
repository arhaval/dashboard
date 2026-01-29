/**
 * Finance Service
 * Handles all financial transaction operations
 */

import { createClient } from '@/lib/supabase/server';
import type { Transaction, TransactionFilters, TransactionType, CreateTransactionInput } from '@/types';

export const financeService = {
  /**
   * Get all transactions with optional filters
   * Admin only (enforced by RLS)
   */
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const supabase = await createClient();

    let query = supabase
      .from('transactions')
      .select('*, payment:payments(id, user_id, user:users(full_name))')
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
      .select('*, payment:payments(id, user_id, user:users(full_name))')
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
      })
      .select()
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
};
