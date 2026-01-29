'use server';

/**
 * Server Actions for Realized Transactions
 */

import { revalidatePath } from 'next/cache';
import { financeService, userService } from '@/services';
import type { TransactionType } from '@/types';

export async function createRealizedTransaction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  try {
    // Verify current user is admin
    const currentUser = await userService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { error: 'Yetkisiz erişim' };
    }

    const type = formData.get('type') as TransactionType;
    const category = formData.get('category') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const transaction_date = formData.get('transaction_date') as string;
    const user_id = formData.get('user_id') as string | null;

    // Validate required fields
    if (!type || !category || !amount || !transaction_date) {
      return { error: 'Tüm zorunlu alanları doldurun' };
    }

    if (amount <= 0) {
      return { error: 'Tutar 0\'dan büyük olmalıdır' };
    }

    // Create transaction
    const transaction = await financeService.create({
      type,
      category,
      amount,
      description: description || undefined,
      transaction_date,
      user_id: user_id || undefined,
    });

    if (!transaction) {
      return { error: 'İşlem oluşturulamadı' };
    }

    // Revalidate paths
    revalidatePath('/payments');
    revalidatePath('/finance');

    return { success: true };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { error: 'Beklenmeyen bir hata oluştu' };
  }
}

export async function deleteRealizedTransaction(
  transactionId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    // Verify current user is admin
    const currentUser = await userService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { error: 'Yetkisiz erişim' };
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('Error deleting transaction:', error);
      return { error: 'İşlem silinemedi' };
    }

    // Revalidate paths
    revalidatePath('/payments');
    revalidatePath('/finance');

    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { error: 'Beklenmeyen bir hata oluştu' };
  }
}
