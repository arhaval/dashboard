/**
 * Dashboard Home Page
 * Main landing page after login.
 * Fetches data based on user role and delegates rendering
 * to DashboardAdmin or DashboardMember.
 */

import { redirect } from 'next/navigation';
import { userService, workItemService, paymentService, financeService } from '@/services';
import { DashboardAdmin } from './dashboard-admin';
import { DashboardMember } from './dashboard-member';

export default async function DashboardPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  if (isAdmin) {
    const [allWorkItems, allUsers, paymentStats] = await Promise.all([
      workItemService.getAll(),
      userService.getAll(),
      paymentService.getStats(),
    ]);

    return (
      <DashboardAdmin
        allWorkItems={allWorkItems}
        allUsers={allUsers}
        paymentStats={paymentStats}
      />
    );
  }

  // Non-admin (team member) dashboard
  const [userWorkItems, userPayments, userTransactions] = await Promise.all([
    workItemService.getAll({ user_id: currentUser.id }),
    paymentService.getByUserId(currentUser.id),
    financeService.getByUserId(currentUser.id),
  ]);

  return (
    <DashboardMember
      userWorkItems={userWorkItems}
      userPayments={userPayments}
      userTransactions={userTransactions}
    />
  );
}
