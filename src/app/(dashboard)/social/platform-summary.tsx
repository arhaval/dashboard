/**
 * Platform Summary strip — the very top of the Social Media page.
 * Shows each platform with its ORIGINAL brand logo and the follower/subscriber
 * count as of the latest pulled data.
 */

import type { SocialMonthlyMetrics } from '@/types';

// Exact brand marks (simple-icons, 24x24 viewBox)
const PATHS = {
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  instagram:
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  twitch:
    'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
  kick: 'M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z',
};

type PlatformKey = 'YOUTUBE' | 'INSTAGRAM' | 'X' | 'TWITCH' | 'KICK';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  path: string;
  bg: string;
  logo: string;
  followerKey: 'subscribers_total' | 'followers_total';
  followerLabel: string;
}

const PLATFORMS: PlatformDef[] = [
  { key: 'YOUTUBE',   label: 'YouTube',   path: PATHS.youtube,   bg: '#FF0000', logo: '#fff', followerKey: 'subscribers_total', followerLabel: 'abone'   },
  { key: 'INSTAGRAM', label: 'Instagram', path: PATHS.instagram, bg: 'linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)', logo: '#fff', followerKey: 'followers_total', followerLabel: 'takipçi' },
  { key: 'X',         label: 'X',         path: PATHS.x,         bg: '#000000', logo: '#fff', followerKey: 'followers_total', followerLabel: 'takipçi' },
  { key: 'TWITCH',    label: 'Twitch',    path: PATHS.twitch,    bg: '#9146FF', logo: '#fff', followerKey: 'followers_total', followerLabel: 'takipçi' },
  { key: 'KICK',      label: 'Kick',      path: PATHS.kick,      bg: '#53FC18', logo: '#000', followerKey: 'followers_total', followerLabel: 'takipçi' },
];

function formatCount(n: number | undefined | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('tr-TR');
}

interface Props {
  metrics: SocialMonthlyMetrics[];
  month: string;
}

export function PlatformSummary({ metrics, month }: Props) {
  const byPlatform = new Map(metrics.map((m) => [m.platform, m]));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Takipçi Sayıları
        </h2>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {month} verisi
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PLATFORMS.map((p) => {
          const m = byPlatform.get(p.key);
          const value = m ? (m[p.followerKey] as number | undefined) : undefined;
          return (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] p-3.5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px]"
                style={{ background: p.bg }}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill={p.logo} aria-label={p.label}>
                  <path d={p.path} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCount(value)}
                </p>
                <p className="truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {p.label} · {p.followerLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
