'use client';

/**
 * Goal Progress - Set monthly targets per platform with progress bars
 * Admin can add/edit goals, non-admin can only view
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn, formatNumber, getPlatformLabel, getPlatformBadgeClass } from '@/lib/utils';
import { GOAL_METRICS_BY_PLATFORM, METRICS_PLATFORMS } from '@/constants';
import { upsertSocialGoal } from './metrics-actions';
import type { GoalProgress as GoalProgressType, MetricsPlatform } from '@/types';

interface GoalProgressProps {
  month: string;
  goals: GoalProgressType[];
  isAdmin: boolean;
}

function ProgressBar({ percentage }: { percentage: number }) {
  const capped = Math.min(percentage, 100);
  const isComplete = percentage >= 100;

  return (
    <div className="h-2 w-full rounded-full bg-[var(--color-bg-primary)]">
      <div
        className={cn(
          'h-2 rounded-full transition-all',
          isComplete ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]'
        )}
        style={{ width: `${capped}%` }}
      />
    </div>
  );
}

function GoalForm({
  month,
  onDone,
}: {
  month: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<MetricsPlatform>('TWITCH');
  const [metricKey, setMetricKey] = useState(GOAL_METRICS_BY_PLATFORM.TWITCH[0].key);
  const [targetValue, setTargetValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const metrics = GOAL_METRICS_BY_PLATFORM[platform];

  function handlePlatformChange(p: MetricsPlatform) {
    setPlatform(p);
    setMetricKey(GOAL_METRICS_BY_PLATFORM[p][0].key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(targetValue);
    if (!value || value <= 0) {
      setError('Geçerli bir hedef değeri girin');
      return;
    }

    setSaving(true);
    setError('');

    const result = await upsertSocialGoal({
      month,
      platform,
      metric_key: metricKey,
      target_value: value,
    });

    if (result.success) {
      router.refresh();
      onDone();
    } else {
      setError(result.error || 'Kaydetme hatası');
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Platform</label>
        <select
          value={platform}
          onChange={(e) => handlePlatformChange(e.target.value as MetricsPlatform)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
        >
          {METRICS_PLATFORMS.map((p) => (
            <option key={p} value={p}>{getPlatformLabel(p)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Metrik</label>
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
        >
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Hedef</label>
        <input
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder="ör. 50000"
          min="1"
          className="w-32 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Ekle'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          İptal
        </Button>
      </div>

      {error && <p className="w-full text-xs text-[var(--color-error)]">{error}</p>}
    </form>
  );
}

export function GoalProgress({ month, goals, isAdmin }: GoalProgressProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          Aylık Hedefler
        </h3>
        {isAdmin && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Hedef Ekle
          </Button>
        )}
      </div>

      {goals.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {isAdmin
            ? 'Henüz hedef belirlenmemiş. "Hedef Ekle" ile başlayın.'
            : 'Henüz hedef belirlenmemiş.'}
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={`${goal.platform}-${goal.metric_key}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      getPlatformBadgeClass(goal.platform)
                    )}
                  >
                    {getPlatformLabel(goal.platform)}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {goal.metric_label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {formatNumber(goal.actual)} / {formatNumber(goal.target)}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      goal.percentage >= 100
                        ? 'text-[var(--color-success)]'
                        : goal.percentage >= 50
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--color-text-muted)]'
                    )}
                  >
                    %{goal.percentage}
                  </span>
                </div>
              </div>
              <ProgressBar percentage={goal.percentage} />
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm month={month} onDone={() => setShowForm(false)} />
      )}
    </div>
  );
}
