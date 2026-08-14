/**
 * ANALİZ — "neden böyle oldu?"
 *
 * Salt okunur. Yönetim işlemi (düzenleme/silme/giriş) burada yok; onlar Veri
 * Merkezi'ne ait.
 *
 * Faz 2'de tek grafik + platform/metrik/aralık seçicisine dönüşecek; şu an
 * mevcut çalışan grafikler taşındı, hiçbir işlev kaybolmadı.
 */

import { redirect } from 'next/navigation';
import { socialMetricsService, userService } from '@/services';
import { TrendCharts } from '../trend-charts';
import { PlatformHistory } from '../platform-history';

export const dynamic = 'force-dynamic';

export default async function SocialAnalyticsPage() {
  const currentUser = await userService.getCurrentUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'ADMIN') redirect('/social');

  const trendData = await socialMetricsService.getTrendData();

  return (
    <div className="flex flex-col gap-6">
      <TrendCharts trendData={trendData} />
      <PlatformHistory isReadOnly />
    </div>
  );
}
