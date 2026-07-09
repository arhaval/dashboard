/**
 * Server-side push notification sender. Callable from any server action to
 * notify specific users or whole roles. Best-effort: failures never throw
 * (a broken notification must not break the triggering business action).
 */

import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;
function ensureVapid(): boolean {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

interface NotifyInput {
  userIds?: string[];
  roles?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Exclude this user (e.g. the person who triggered the event). */
  excludeUserId?: string;
}

export const notificationService = {
  async notify(input: NotifyInput): Promise<void> {
    try {
      if (!ensureVapid()) return;
      const admin = createAdminClient();

      const ids = new Set<string>(input.userIds ?? []);
      if (input.roles && input.roles.length > 0) {
        const { data } = await admin
          .from('users')
          .select('id')
          .in('role', input.roles)
          .eq('is_active', true);
        for (const u of (data ?? []) as { id: string }[]) ids.add(u.id);
      }
      if (input.excludeUserId) ids.delete(input.excludeUserId);
      if (ids.size === 0) return;

      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .in('user_id', [...ids]);
      if (!subs || subs.length === 0) return;

      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url ?? '/',
        tag: input.tag ?? 'arhaval',
      });

      type SubRow = { endpoint: string; p256dh: string; auth: string };
      const rows = subs as SubRow[];
      const results = await Promise.allSettled(
        rows.map((s) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        )
      );

      const expired: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410) {
          expired.push(rows[i].endpoint);
        }
      });
      if (expired.length > 0) {
        await admin.from('push_subscriptions').delete().in('endpoint', expired);
      }
    } catch {
      /* best-effort — never break the caller */
    }
  },
};
