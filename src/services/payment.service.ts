/**
 * Payment Service
 * Handles all payment-related data operations
 */

import { createClient } from '@/lib/supabase/server';
import type { Payment, PaymentFilters, PaymentStatus, WorkItem } from '@/types';

export const paymentService = {
  /**
   * Get all payments with optional filters
   * Admin only (enforced by RLS)
   */
  async getAll(filters?: PaymentFilters): Promise<Payment[]> {
    const supabase = await createClient();

    let query = supabase
      .from('payments')
      .select(
        `
        *,
        user:users(id, full_name, email, role),
        payment_items(
          id,
          work_item_id,
          work_item:work_items(id, work_type, work_date, match_name, content_name, cost)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.date_from) {
      query = query.gte('payment_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('payment_date', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error.message);
      return [];
    }

    return data || [];
  },

  /**
   * Get payment by ID
   */
  async getById(id: string): Promise<Payment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        user:users(id, full_name, email, role),
        payment_items(
          id,
          work_item_id,
          work_item:work_items(id, work_type, work_date, match_name, content_name, cost)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching payment:', error.message);
      return null;
    }

    return data;
  },

  /**
   * Check if a work item already has a payment
   */
  async getPaymentForWorkItem(workItemId: string): Promise<Payment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_items')
      .select('payment_id, payment:payments(*)')
      .eq('work_item_id', workItemId)
      .single();

    if (error || !data) {
      return null;
    }

    // Supabase returns nested relation as object, cast properly
    const payment = data.payment as unknown as Payment | null;
    return payment;
  },

  /**
   * Create a payment from approved work items
   * Uses atomic RPC - idempotent and race-condition safe
   */
  async createFromWorkItems(
    userId: string,
    workItemIds: string[],
    adminUserId: string,
    notes?: string
  ): Promise<{ paymentId: string | null; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('rpc_create_payment_from_work_items', {
      p_admin_user_id: adminUserId,
      p_target_user_id: userId,
      p_work_item_ids: workItemIds,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error creating payment:', error.message);
      return { paymentId: null, error: error.message };
    }

    return { paymentId: data as string };
  },

  /**
   * Mark payment as paid and create transaction record
   * Uses atomic RPC - all-or-nothing operation
   */
  async markAsPaid(
    paymentId: string,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('rpc_mark_payment_paid', {
      p_admin_user_id: adminUserId,
      p_payment_id: paymentId,
    });

    if (error) {
      console.error('Error marking payment as paid:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Cancel a pending payment
   * Uses atomic RPC - reverts work items if needed
   */
  async cancel(
    paymentId: string,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('rpc_cancel_payment', {
      p_admin_user_id: adminUserId,
      p_payment_id: paymentId,
    });

    if (error) {
      console.error('Error cancelling payment:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Get payment stats
   */
  async getStats(userId?: string): Promise<{
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    totalAmount: number;
  }> {
    const supabase = await createClient();

    let query = supabase.from('payments').select('status, amount');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return { total: 0, pending: 0, paid: 0, cancelled: 0, totalAmount: 0 };
    }

    return {
      total: data.length,
      pending: data.filter((p) => p.status === 'PENDING').length,
      paid: data.filter((p) => p.status === 'PAID').length,
      cancelled: data.filter((p) => p.status === 'CANCELLED').length,
      totalAmount: data
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0),
    };
  },

  /**
   * Get payments for a specific user (their own payments)
   */
  async getByUserId(userId: string): Promise<Payment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        user:users(id, full_name, email, role),
        payment_items(
          id,
          work_item_id,
          work_item:work_items(id, work_type, work_date, match_name, content_name, cost)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user payments:', error.message);
      return [];
    }

    return data || [];
  },
};
