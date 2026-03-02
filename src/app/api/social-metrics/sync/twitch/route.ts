/**
 * Twitch Sync API
 * Fetches channel data from Twitch Helix API and saves to social_monthly_metrics
 * POST /api/social-metrics/sync/twitch
 * Admin-only
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { socialMetricsService } from '@/services';
import type { CreateSocialMonthlyMetricsInput } from '@/types';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_CHANNEL_LOGIN = process.env.TWITCH_CHANNEL_LOGIN;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function getTwitchAppToken(): Promise<string> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID!,
      client_secret: TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Twitch OAuth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function twitchGet(endpoint: string, token: string) {
  const res = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Client-Id': TWITCH_CLIENT_ID!,
    },
  });

  if (!res.ok) {
    throw new Error(`Twitch API ${endpoint} failed: ${res.status}`);
  }

  return res.json();
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
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_CHANNEL_LOGIN) {
    return NextResponse.json(
      { error: 'Twitch API credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // 3. Get app access token
    const token = await getTwitchAppToken();

    // 4. Get user info
    const usersData = await twitchGet(`/users?login=${TWITCH_CHANNEL_LOGIN}`, token);
    const twitchUser = usersData.data?.[0];

    if (!twitchUser) {
      return NextResponse.json(
        { error: `Twitch user "${TWITCH_CHANNEL_LOGIN}" not found` },
        { status: 404 }
      );
    }

    const broadcasterId = twitchUser.id;

    // 5. Get stream data (if live)
    const streamsData = await twitchGet(`/streams?user_id=${broadcasterId}`, token);
    const stream = streamsData.data?.[0];

    // 6. Get existing record to preserve manual data
    const month = getCurrentMonth();
    const existing = await socialMetricsService.getByMonthAndPlatform(month, 'TWITCH');

    // 7. Build update data - preserve existing manual data, override with API data
    const syncData: CreateSocialMonthlyMetricsInput = {
      month,
      platform: 'TWITCH',
      followers_total: existing?.followers_total || 0,
      live_views: existing?.live_views,
      unique_chatters: existing?.unique_chatters,
      subs_total: existing?.subs_total,
      total_stream_time_minutes: existing?.total_stream_time_minutes,
      avg_viewers: existing?.avg_viewers,
      unique_viewers: existing?.unique_viewers,
      peak_viewers: existing?.peak_viewers,
    };

    // If currently live, update peak viewer count
    if (stream) {
      syncData.peak_viewers = Math.max(
        stream.viewer_count || 0,
        existing?.peak_viewers || 0
      );
    }

    const { metrics, error } = await socialMetricsService.upsert(syncData);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: {
        channel: TWITCH_CHANNEL_LOGIN,
        isLive: !!stream,
        viewerCount: stream?.viewer_count || null,
        peakViewers: syncData.peak_viewers,
      },
      metrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
