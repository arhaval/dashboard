/**
 * Dashboard Home Page
 * Main landing page after login.
 * Fetches data based on user role and delegates rendering
 * to DashboardAdmin or DashboardPersonal (all other roles).
 */

import { redirect } from 'next/navigation';
import { userService, workItemService, paymentService, financeService } from '@/services';
import { getCurrentMonth } from '@/services/finance.service';
import { contentGoalService } from '@/services/content-goal.service';
import { weeklyScheduleService } from '@/services/weekly-schedule.service';
import { contentQueueService } from '@/services/content-queue.service';
import { contentPlanService } from '@/services/content-plan.service';
import { permissionService } from '@/services/permission.service';
import { tr } from '@/lib/i18n';
import { DashboardAdmin } from './dashboard-admin';
import { DashboardPersonal } from './dashboard-personal';

export default async function DashboardPage() {
  const currentUser = await userService.getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  if (isAdmin) {
    const currentMonth = getCurrentMonth();

    const [
      dash,
      allUsers,
      paymentStats,
      monthlyFinanceStats,
      weeklyGoalProgress,
      weeklySchedule,
      contentQueue,
      streamPlans,
    ] = await Promise.all([
      workItemService.getDashboardData(currentMonth, 6),
      userService.getAll(),
      paymentService.getStats(),
      financeService.getStatsByMonth(currentMonth),
      contentGoalService.getWeeklyProgress(),
      weeklyScheduleService.getAll(),
      // "Bugün" şeridi için: takılan içerik, seslendirmede/kurguda olan,
      // yayına hazır bekleyen.
      contentQueueService.getAll(),
      contentPlanService.getUpcoming(),
    ]);

    const { allWorkItems, unpaidTotal, contentStats, contentTrend, teamContentStats } = dash;

    return (
      <DashboardAdmin
        viewer={currentUser}
        contentQueue={contentQueue}
        allWorkItems={allWorkItems}
        allUsers={allUsers}
        paymentStats={paymentStats}
        monthlyFinanceStats={monthlyFinanceStats}
        unpaidTotal={unpaidTotal}
        contentStats={contentStats}
        contentTrend={contentTrend}
        teamContentStats={teamContentStats}
        weeklyGoalProgress={weeklyGoalProgress}
        weeklySchedule={weeklySchedule}
        streamPlans={streamPlans.filter((sp) => sp.content_type === 'STREAM')}
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

  // Kişisel dashboard — tüm admin dışı roller. Yayıncıda ölçü harita sayısı,
  // diğer rollerde iş sayısı.
  const month = getCurrentMonth();
  // Açık planlar: yaklaşanlar + tarihi geçip hâlâ girilmemiş olanlar
  const [myPlans, allowedPages] = await Promise.all([
    contentPlanService.getUpcoming(currentUser.id),
    permissionService.getAllowedPages(currentUser.role),
  ]);

  return (
    <DashboardPersonal
      variant={currentUser.role === 'PUBLISHER' ? 'stream' : 'work'}
      roleLabel={tr.roles[currentUser.role as keyof typeof tr.roles] ?? currentUser.role}
      userWorkItems={userWorkItems}
      userPayments={userPayments}
      userTransactions={userTransactions}
      myPlans={myPlans}
      currentMonth={month}
      fullName={currentUser.full_name}
      avatarUrl={currentUser.avatar_url}
      joinedAt={currentUser.created_at}
      userId={currentUser.id}
      email={currentUser.email}
      allowedPages={allowedPages}
    />
  );
}
