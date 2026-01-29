'use client';

/**
 * Social Metrics Form
 * Dynamic form that shows platform-specific fields
 */

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { upsertSocialMetrics } from './metrics-actions';
import type { MetricsPlatform, CreateSocialMonthlyMetricsInput } from '@/types';

const PLATFORM_OPTIONS: { value: MetricsPlatform; label: string }[] = [
  { value: 'TWITCH', label: 'Twitch' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X (Twitter)' },
];

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'number' | 'decimal';
}

const PLATFORM_FIELDS: Record<MetricsPlatform, FieldConfig[]> = {
  TWITCH: [
    { name: 'total_stream_time_minutes', label: 'Total Stream Time (minutes)', type: 'number' },
    { name: 'avg_viewers', label: 'Average Viewers', type: 'number' },
    { name: 'peak_viewers', label: 'Peak Viewers', type: 'number' },
    { name: 'unique_viewers', label: 'Unique Viewers', type: 'number' },
    { name: 'live_views', label: 'Live Views', type: 'number' },
    { name: 'unique_chatters', label: 'Unique Chatters', type: 'number' },
    { name: 'subs_total', label: 'Total Subscribers', type: 'number' },
  ],
  YOUTUBE: [
    { name: 'subscribers_total', label: 'Total Subscribers', type: 'number' },
    { name: 'video_views', label: 'Video Views', type: 'number' },
    { name: 'shorts_views', label: 'Shorts Views', type: 'number' },
    { name: 'live_views', label: 'Live Views', type: 'number' },
    { name: 'total_likes', label: 'Total Likes', type: 'number' },
    { name: 'total_comments', label: 'Total Comments', type: 'number' },
    { name: 'avg_live_viewers', label: 'Avg Live Viewers', type: 'number' },
    { name: 'peak_live_viewers', label: 'Peak Live Viewers', type: 'number' },
  ],
  INSTAGRAM: [
    { name: 'views', label: 'Views', type: 'number' },
    { name: 'likes', label: 'Likes', type: 'number' },
    { name: 'comments', label: 'Comments', type: 'number' },
    { name: 'saves', label: 'Saves', type: 'number' },
    { name: 'shares', label: 'Shares', type: 'number' },
  ],
  X: [
    { name: 'impressions', label: 'Impressions', type: 'number' },
    { name: 'engagement_rate', label: 'Engagement Rate (%)', type: 'decimal' },
    { name: 'likes', label: 'Likes', type: 'number' },
    { name: 'replies', label: 'Replies', type: 'number' },
    { name: 'profile_visits', label: 'Profile Visits', type: 'number' },
  ],
};

export function MetricsForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [month, setMonth] = useState(getCurrentMonth());
  const [platform, setPlatform] = useState<MetricsPlatform>('TWITCH');
  const [followersTotal, setFollowersTotal] = useState('');
  const [platformFields, setPlatformFields] = useState<Record<string, string>>({});

  const handlePlatformChange = (newPlatform: MetricsPlatform) => {
    setPlatform(newPlatform);
    setPlatformFields({}); // Reset platform-specific fields
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setPlatformFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const input: CreateSocialMonthlyMetricsInput = {
      month,
      platform,
      followers_total: parseInt(followersTotal) || 0,
    };

    // Add platform-specific fields
    const fields = PLATFORM_FIELDS[platform];
    for (const field of fields) {
      const value = platformFields[field.name];
      if (value) {
        if (field.type === 'decimal') {
          (input as unknown as Record<string, unknown>)[field.name] = parseFloat(value) || 0;
        } else {
          (input as unknown as Record<string, unknown>)[field.name] = parseInt(value) || 0;
        }
      }
    }

    startTransition(async () => {
      const result = await upsertSocialMetrics(input);

      if (!result.success) {
        setError(result.error || 'Failed to save metrics');
        return;
      }

      // Reset form
      setFollowersTotal('');
      setPlatformFields({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const currentFields = PLATFORM_FIELDS[platform];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-text-primary)]">
        Add/Update Monthly Metrics
      </h3>

      {error && (
        <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-error-muted)] p-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-success-muted)] p-3 text-sm text-[var(--color-success)]">
          Metrics saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Month and Platform */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Month
            </label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              Platform
            </label>
            <Select
              value={platform}
              onChange={(e) => handlePlatformChange(e.target.value as MetricsPlatform)}
              disabled={isPending}
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
              {platform === 'YOUTUBE' ? 'Subscribers' : 'Followers'} Total
            </label>
            <Input
              type="number"
              value={followersTotal}
              onChange={(e) => setFollowersTotal(e.target.value)}
              placeholder="0"
              min="0"
              required
              disabled={isPending}
            />
          </div>
        </div>

        {/* Platform-specific fields */}
        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">
            {platform} Metrics
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currentFields.map((field) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                  {field.label}
                </label>
                <Input
                  type="number"
                  value={platformFields[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder="0"
                  min="0"
                  step={field.type === 'decimal' ? '0.01' : '1'}
                  disabled={isPending}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Metrics'}
          </Button>
        </div>
      </form>
    </div>
  );
}
