/**
 * Dashboard Home Page
 * Main landing page after login.
 * Fetches data based on user role and delegates rendering
 * to DashboardAdmin or DashboardMember.
 */

import { redirect } from 'next/navigation';
import { userService, workItemService, paymentService, financeService } from '@/services';
import { getCurrentMonth } from '@/services/finance.service';
import { DashboardAdmin } from './dashboard-admin';
import { DashboardMember } from './dashboard-member';

export default async function DashboardPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  if (isAdmin) {
    const currentMonth = getCurrentMonth();

    const [
      allWorkItems,
      allUsers,
      paymentStats,
      monthlyFinanceStats,
      unpaidTotal,
      contentStats,
      contentTrend,
      teamContentStats,
    ] = await Promise.all([
      workItemService.getAll(),
      userService.getAll(),
      paymentService.getStats(),
      financeService.getStatsByMonth(currentMonth),
      workItemService.getUnpaidTotal(),
      workItemService.getContentStats(currentMonth),
      workItemService.getContentTrend(6),
      workItemService.getTeamContentStats(currentMonth),
    ]);

    return (
      <DashboardAdmin
        allWorkItems={allWorkItems}
        allUsers={allUsers}
        paymentStats={paymentStats}
        monthlyFinanceStats={monthlyFinanceStats}
        unpaidTotal={unpaidTotal}
        contentStats={contentStats}
        contentTrend={contentTrend}
        teamContentStats={teamContentStats}
        currentMonth={currentMonth}
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
