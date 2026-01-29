/**
 * Social Metrics History API
 * Returns monthly history for a specific platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { socialMetricsService } from '@/services';
import type { MetricsPlatform } from '@/types';

export async function GET(request: NextRequest) {
  // 1. Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify admin role
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Get platform from query
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') as MetricsPlatform | null;

  if (!platform) {
    return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
  }

  const validPlatforms: MetricsPlatform[] = ['TWITCH', 'YOUTUBE', 'INSTAGRAM', 'X'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // 4. Get history
  const metrics = await socialMetricsService.getByPlatform(platform);

  return NextResponse.json({ metrics });
}
