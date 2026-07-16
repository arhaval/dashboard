/**
 * Cron route authentication.
 *
 * Cron routes are exempt from the auth middleware (Vercel Cron calls them with
 * no session), so they must authenticate themselves. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when the CRON_SECRET
 * environment variable is set on the project.
 *
 * In production the secret is MANDATORY: without it these endpoints would be
 * open to the internet, and /api/cron/idea-reminder pushes notifications to the
 * whole team.
 */

/** Returns a Response to bail out with, or null when the caller may proceed. */
export function denyCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return new Response('CRON_SECRET is not configured', { status: 503 });
    }
    return null; // local development
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
