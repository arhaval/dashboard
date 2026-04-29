import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  tag: z.string().optional(),
  // Optional: target specific user(s). If omitted, sends to all users (admin broadcast).
  targetUserIds: z.array(z.string().uuid()).optional(),
});

// POST /api/push/send — send a push notification (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const result = sendSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { title, body: notifBody, url, tag, targetUserIds } = result.data;

  // Fetch subscriptions
  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth');
  if (targetUserIds && targetUserIds.length > 0) {
    query = query.in('user_id', targetUserIds);
  }

  const { data: subscriptions, error: fetchError } = await query;

  if (fetchError || !subscriptions) {
    return Response.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }

  if (subscriptions.length === 0) {
    return Response.json({ sent: 0, message: 'No subscribers' });
  }

  const payload = JSON.stringify({ title, body: notifBody, url: url ?? '/', tag: tag ?? 'arhaval' });

  type SubRow = { endpoint: string; p256dh: string; auth: string };

  const results = await Promise.allSettled(
    (subscriptions as SubRow[]).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  // Clean up expired subscriptions (410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((result: PromiseSettledResult<webpush.SendResult>, i: number) => {
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410) {
        expiredEndpoints.push((subscriptions as SubRow[])[i].endpoint);
      }
    }
  });

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  return Response.json({ sent, failed });
}
