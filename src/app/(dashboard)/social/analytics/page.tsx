/**
 * ANALİZ — "neden böyle oldu?"
 *
 * Tek grafik, üç seçici (platform / aralık / metrik). Salt okunur: düzenleme
 * ve silme burada yok, onlar Veri Merkezi'ne ait.
 */

import { redirect } from 'next/navigation';
import { socialMetricsService, userService } from '@/services';
import { AnalyticsExplorer, type MetricRow } from './analytics-explorer';

export const dynamic = 'force-dynamic';

export default async function SocialAnalyticsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/social');

  // Bütün geçmiş tek seferde gelir; aralık filtresi istemcide, böylece seçici
  // değiştikçe sunucuya gidilmez.
  const rows = (await socialMetricsService.getTrendData()) as unknown as MetricRow[];

  return <AnalyticsExplorer rows={rows} currentYear={new Date().getFullYear()} />;
}
