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
   * Idempotent: won't create if work item already has a payment
   */
  async createFromWorkItems(
    userId: string,
    workItemIds: string[],
    notes?: string
  ): Promise<{ payment: Payment | null; error?: string }> {
    const supabase = await createClient();

    // 1. Verify work items exist, are APPROVED, and belong to the user
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('*')
      .in('id', workItemIds)
      .eq('user_id', userId)
      .eq('status', 'APPROVED');

    if (workItemsError || !workItems || workItems.length === 0) {
      return { payment: null, error: 'No approved work items found' };
    }

    if (workItems.length !== workItemIds.length) {
      return { payment: null, error: 'Some work items are not approved or do not belong to the user' };
    }

    // 2. Check none of these work items already have payments
    const { data: existingPaymentItems } = await supabase
      .from('payment_items')
      .select('work_item_id')
      .in('work_item_id', workItemIds);

    if (existingPaymentItems && existingPaymentItems.length > 0) {
      return { payment: null, error: 'One or more work items already have payments' };
    }

    // 3. Calculate total amount
    const totalAmount = workItems.reduce((sum, item) => sum + (item.cost || 0), 0);

    if (totalAmount <= 0) {
      return { payment: null, error: 'Total payment amount must be greater than 0' };
    }

    // 4. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: totalAmount,
        status: 'PENDING',
        payment_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment:', paymentError?.message);
      return { payment: null, error: 'Failed to create payment' };
    }

    // 5. Create payment items (links to work items)
    const paymentItems = workItemIds.map((workItemId) => ({
      payment_id: payment.id,
      work_item_id: workItemId,
    }));

    const { error: paymentItemsError } = await supabase
      .from('payment_items')
      .insert(paymentItems);

    if (paymentItemsError) {
      console.error('Error creating payment items:', paymentItemsError.message);
      // Rollback: delete the payment
      await supabase.from('payments').delete().eq('id', payment.id);
      return { payment: null, error: 'Failed to link work items to payment' };
    }

    return { payment };
  },

  /**
   * Mark payment as paid and create transaction record
   */
  async markAsPaid(paymentId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // 1. Get payment with user info and verify it's PENDING
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, user:users(full_name), payment_items(work_item_id)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'PENDING') {
      return { success: false, error: `Payment is ${payment.status}, cannot mark as paid` };
    }

    // 2. Update payment status to PAID
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'PAID' })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment:', updateError.message);
      return { success: false, error: 'Failed to update payment status' };
    }

    // 3. Update all linked work items to PAID status
    const workItemIds = payment.payment_items?.map((pi: { work_item_id: string }) => pi.work_item_id) || [];

    if (workItemIds.length > 0) {
      const { error: workItemsError } = await supabase
        .from('work_items')
        .update({ status: 'PAID' })
        .in('id', workItemIds);

      if (workItemsError) {
        console.error('Error updating work items:', workItemsError.message);
        // Don't rollback, payment is already marked paid
      }
    }

    // 4. Create transaction record (EXPENSE for team payment)
    const userName = (payment.user as { full_name: string } | null)?.full_name || 'team member';
    const { error: transactionError } = await supabase.from('transactions').insert({
      type: 'EXPENSE',
      category: 'Team Payments',
      amount: payment.amount,
      description: `Payment to ${userName}`,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_id: paymentId,
    });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError.message);
      // Don't rollback, this is a secondary action
    }

    return { success: true };
  },

  /**
   * Cancel a pending payment
   */
  async cancel(paymentId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // 1. Verify payment is PENDING
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'PENDING') {
      return { success: false, error: `Payment is ${payment.status}, cannot cancel` };
    }

    // 2. Update status to CANCELLED
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'CANCELLED' })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error cancelling payment:', updateError.message);
      return { success: false, error: 'Failed to cancel payment' };
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
