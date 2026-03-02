/**
 * YouTube Sync API
 * Fetches channel stats from YouTube Data API v3 and saves to social_monthly_metrics
 * POST /api/social-metrics/sync/youtube
 * Admin-only
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { socialMetricsService } from '@/services';
import type { CreateSocialMonthlyMetricsInput } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST() {
  // 1. Verify authentication + admin role
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Check env vars
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    return NextResponse.json(
      { error: 'YouTube API credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // 3. Fetch channel statistics
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'statistics,snippet');
    url.searchParams.set('id', YOUTUBE_CHANNEL_ID);
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`YouTube API failed: ${res.status}`);
    }

    const data = await res.json();
    const channel = data.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: `YouTube channel "${YOUTUBE_CHANNEL_ID}" not found` },
        { status: 404 }
      );
    }

    const stats = channel.statistics;
    const subscriberCount = Number(stats.subscriberCount) || 0;
    const totalViewCount = Number(stats.viewCount) || 0;

    // 4. Get existing record to preserve manual data
    const month = getCurrentMonth();
    const existing = await socialMetricsService.getByMonthAndPlatform(month, 'YOUTUBE');

    // 5. Build update data - API data + preserve existing manual data
    const syncData: CreateSocialMonthlyMetricsInput = {
      month,
      platform: 'YOUTUBE',
      followers_total: subscriberCount,
      subscribers_total: subscriberCount,
      video_views: existing?.video_views,
      shorts_views: existing?.shorts_views,
      live_views: existing?.live_views,
      total_likes: existing?.total_likes,
      total_comments: existing?.total_comments,
      avg_live_viewers: existing?.avg_live_viewers,
      peak_live_viewers: existing?.peak_live_viewers,
    };

    const { metrics, error } = await socialMetricsService.upsert(syncData);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: {
        channelTitle: channel.snippet?.title,
        subscriberCount,
        totalViewCount,
      },
      metrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
