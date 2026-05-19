'use client';

/**
 * Social Metrics Form
 * Dynamic form with platform-specific fields and CSV auto-fill drop zone.
 */

import { useState, useTransition, useCallback } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { tr } from '@/lib/i18n';
import { upsertSocialMetrics, parseChannelMonthlyCSV } from './metrics-actions';
import type { MetricsPlatform, CreateSocialMonthlyMetricsInput } from '@/types';

// ── Platform options ──────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: { value: MetricsPlatform; label: string }[] = [
  { value: 'TWITCH',    label: tr.social.platforms.TWITCH    },
  { value: 'KICK',      label: tr.social.platforms.KICK      },
  { value: 'YOUTUBE',   label: tr.social.platforms.YOUTUBE   },
  { value: 'INSTAGRAM', label: tr.social.platforms.INSTAGRAM },
  { value: 'X',         label: tr.social.platforms.X         },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Field definitions ─────────────────────────────────────────────────────────

interface FieldConfig {
  name: string;
  label: string;
  type: 'number' | 'decimal';
  /** CSV'den gelen veri hangi key'e karşılık gelir */
  csvKey?: string;
}

const PLATFORM_FIELDS: Record<MetricsPlatform, FieldConfig[]> = {
  TWITCH: [
    { name: 'total_stream_time_minutes', label: tr.metricsForm.totalStreamTime, type: 'number',  csvKey: 'total_stream_time_minutes' },
    { name: 'avg_viewers',               label: tr.metricsForm.avgViewers,       type: 'number',  csvKey: 'avg_viewers'               },
    { name: 'peak_viewers',              label: tr.metricsForm.peakViewers,      type: 'number',  csvKey: 'peak_viewers'               },
    { name: 'unique_viewers',            label: tr.metricsForm.uniqueViewers,    type: 'number'                                        },
    { name: 'live_views',                label: tr.metricsForm.liveViews,        type: 'number',  csvKey: 'live_views'                 },
    { name: 'unique_chatters',           label: tr.metricsForm.uniqueChatters,   type: 'number'                                        },
    { name: 'subs_total',                label: tr.metricsForm.subsTotal,        type: 'number'                                        },
  ],
  KICK: [
    { name: 'followers_total',           label: tr.metricsForm.followersTotal,   type: 'number'                                        },
    { name: 'peak_viewers',              label: tr.metricsForm.peakViewers,      type: 'number',  csvKey: 'peak_viewers'               },
    { name: 'avg_viewers',               label: tr.metricsForm.avgViewers,       type: 'number',  csvKey: 'avg_viewers'                },
    { name: 'live_views',                label: tr.metricsForm.liveViews,        type: 'number',  csvKey: 'live_views'                 },
    { name: 'total_stream_time_minutes', label: tr.metricsForm.totalStreamTime,  type: 'number',  csvKey: 'total_stream_time_minutes'  },
  ],
  YOUTUBE: [
    { name: 'subscribers_total',  label: tr.metricsForm.subscribersTotal,  type: 'number',  csvKey: 'subscribers_total'   },
    { name: 'video_views',        label: tr.metricsForm.videoViews,        type: 'number',  csvKey: 'video_views'         },
    { name: 'shorts_views',       label: tr.metricsForm.shortsViews,       type: 'number'                                 },
    { name: 'live_views',         label: tr.metricsForm.liveViews,         type: 'number'                                 },
    { name: 'total_likes',        label: tr.metricsForm.totalLikes,        type: 'number',  csvKey: 'total_likes'         },
    { name: 'total_comments',     label: tr.metricsForm.totalComments,     type: 'number',  csvKey: 'total_comments'      },
    { name: 'avg_live_viewers',   label: tr.metricsForm.avgLiveViewers,    type: 'number'                                 },
    { name: 'peak_live_viewers',  label: tr.metricsForm.peakLiveViewers,   type: 'number'                                 },
  ],
  INSTAGRAM: [
    { name: 'views',    label: tr.metricsForm.views,    type: 'number', csvKey: 'impressions'     },
    { name: 'likes',    label: tr.metricsForm.likes,    type: 'number', csvKey: 'likes'           },
    { name: 'comments', label: tr.metricsForm.comments, type: 'number', csvKey: 'comments'        },
    { name: 'saves',    label: tr.metricsForm.saves,    type: 'number', csvKey: 'saves'           },
    { name: 'shares',   label: tr.metricsForm.shares,   type: 'number', csvKey: 'shares'          },
  ],
  X: [
    { name: 'impressions',    label: tr.metricsForm.impressions,    type: 'number',  csvKey: 'impressions'    },
    { name: 'likes',          label: tr.metricsForm.likes,          type: 'number',  csvKey: 'likes'          },
    { name: 'replies',        label: tr.metricsForm.replies,        type: 'number',  csvKey: 'replies'        },
    { name: 'shares',         label: tr.metricsForm.retweets,       type: 'number',  csvKey: 'retweets'       },
    { name: 'profile_visits', label: tr.metricsForm.profileVisits,  type: 'number',  csvKey: 'profile_visits' },
  ],
};

// ── CSV dosya bırakma alanı ───────────────────────────────────────────────────

type CsvStatus = 'idle' | 'parsing' | 'success' | 'error';

function CsvDropZone({
  platform,
  onFill,
}: {
  platform: MetricsPlatform;
  onFill: (data: Record<string, number>) => void;
}) {
  const [status, setStatus]   = useState<CsvStatus>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition]   = useTransition();

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.type.includes('comma')) {
      setStatus('error');
      setMessage('Yalnızca .csv dosyası kabul edilir.');
      return;
    }

    setStatus('parsing');
    setMessage(tr.metricsForm.csvParsing);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const csvText = ev.target?.result as string;
      startTransition(async () => {
        const result = await parseChannelMonthlyCSV(csvText, platform);
        if (!result.success || !result.data) {
          setStatus('error');
          setMessage(result.error ?? tr.metricsForm.csvError);
          return;
        }
        onFill(result.data);
        setStatus('success');
        setMessage(`${tr.metricsForm.csvFilled} (${Object.keys(result.data).length} alan)`);
        setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
      });
    };
    reader.readAsText(file, 'utf-8');
  }, [platform, onFill, startTransition]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const borderColor = isDragging
    ? 'var(--color-accent)'
    : status === 'success' ? 'var(--color-success)'
    : status === 'error'   ? 'var(--color-error)'
    : 'var(--color-border)';

  const bgColor = isDragging
    ? 'rgba(255,77,0,0.06)'
    : status === 'success' ? 'rgba(34,197,94,0.05)'
    : status === 'error'   ? 'rgba(239,68,68,0.05)'
    : 'var(--color-bg-primary)';

  return (
    <label
      htmlFor="csv-drop-input"
      onDragOver={(e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop as React.DragEventHandler<HTMLLabelElement>}
      className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-[var(--radius-md)] border-2 border-dashed px-4 py-5 text-center transition-colors"
      style={{ borderColor, background: bgColor, minHeight: 100 }}>

      {status === 'parsing' && (
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      )}
      {status === 'success' && (
        <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
      )}
      {status === 'error' && (
        <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
      )}
      {status === 'idle' && (
        <UploadCloud size={20} style={{ color: 'var(--color-text-muted)' }} />
      )}

      <div>
        <p className="text-xs font-semibold"
          style={{ color: status === 'idle' ? 'var(--color-text-secondary)' : status === 'success' ? 'var(--color-success)' : status === 'error' ? 'var(--color-error)' : 'var(--color-accent)' }}>
          {status === 'idle'
            ? tr.metricsForm.csvUpload
            : message}
        </p>
        {status === 'idle' && (
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {platform} CSV — {tr.metricsForm.csvUploadHint}
          </p>
        )}
      </div>

      <input
        id="csv-drop-input"
        type="file"
        accept=".csv,text/csv"
        onChange={onInputChange}
        className="sr-only"
      />
    </label>
  );
}

// ── Ana form ──────────────────────────────────────────────────────────────────

export function MetricsForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [month, setMonth]   = useState(getCurrentMonth());
  const [platform, setPlatform] = useState<MetricsPlatform>('TWITCH');
  const [followersTotal, setFollowersTotal] = useState('');
  const [platformFields, setPlatformFields] = useState<Record<string, string>>({});

  const handlePlatformChange = (newPlatform: MetricsPlatform) => {
    setPlatform(newPlatform);
    setPlatformFields({});
    setFollowersTotal('');
    setError(null);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setPlatformFields(prev => ({ ...prev, [fieldName]: value }));
  };

  /** CSV'den gelen verilerle formu otomatik doldurur */
  const handleCsvFill = useCallback((data: Record<string, number>) => {
    const fields = PLATFORM_FIELDS[platform];

    // Takipçi / abone alanlarını üst inputa yaz
    const followerKeys = ['followers_total', 'subscribers_total', 'followers_gained'];
    for (const key of followerKeys) {
      if (data[key] !== undefined) {
        setFollowersTotal(String(data[key]));
        break;
      }
    }

    // Platform alanlarını csvKey eşleşmesiyle doldur
    setPlatformFields(prev => {
      const next = { ...prev };
      for (const field of fields) {
        const csvKey = field.csvKey ?? field.name;
        if (data[csvKey] !== undefined) {
          next[field.name] = String(data[csvKey]);
        }
      }
      return next;
    });
  }, [platform]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const input: CreateSocialMonthlyMetricsInput = {
      month,
      platform,
      followers_total: parseInt(followersTotal) || 0,
    };

    const fields = PLATFORM_FIELDS[platform];
    for (const field of fields) {
      // Kick'in followers_total alanı ana inputtan gelir, platform fields'dan değil
      if (field.name === 'followers_total') continue;
      const value = platformFields[field.name];
      if (value) {
        (input as unknown as Record<string, unknown>)[field.name] =
          field.type === 'decimal' ? parseFloat(value) || 0 : parseInt(value) || 0;
      }
    }

    startTransition(async () => {
      const result = await upsertSocialMetrics(input);
      if (!result.success) {
        setError(result.error || tr.messages.error.failedToSave);
        return;
      }
      setFollowersTotal('');
      setPlatformFields({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const currentFields = PLATFORM_FIELDS[platform];
  // Kick'in "followers_total" alanı zaten üst kısımda gösterildiğinden listeyi filtrele
  const visibleFields = platform === 'KICK'
    ? currentFields.filter(f => f.name !== 'followers_total')
    : currentFields;

  const isYouTube = platform === 'YOUTUBE';

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-text-primary)]">
        {tr.metricsForm.title}
      </h3>

      {error && (
        <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-error-muted)] p-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-success-muted)] p-3 text-sm text-[var(--color-success)]">
          {tr.messages.success.metricsSaved}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        {/* ── Sol: form alanları ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ay / Platform / Takipçi */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                {tr.metricsForm.month}
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
                {tr.metricsForm.platform}
              </label>
              <Select
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value as MetricsPlatform)}
                disabled={isPending}
              >
                {PLATFORM_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                {isYouTube ? tr.metricsForm.subscribersTotal : tr.metricsForm.followersTotal}
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

          {/* Platform metrik alanları */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">
              {platform} {tr.metricsForm.metrics}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleFields.map(field => (
                <div key={field.name}>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                    {field.label}
                  </label>
                  <Input
                    type="number"
                    value={platformFields[field.name] ?? ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder="0"
                    min="0"
                    step={field.type === 'decimal' ? '0.01' : '1'}
                    disabled={isPending}
                    style={
                      platformFields[field.name]
                        ? { borderColor: 'var(--color-accent)', outline: 'none' }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Kaydet */}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? tr.metricsForm.saving : tr.metricsForm.saveMetrics}
            </Button>
          </div>
        </form>

        {/* ── Sağ: CSV drop zone ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            {tr.metricsForm.csvUpload}
          </p>
          <CsvDropZone platform={platform} onFill={handleCsvFill} />
          <p className="text-[11px] leading-snug text-[var(--color-text-muted)]">
            {platform === 'TWITCH' || platform === 'KICK'
              ? 'Dashboard → Analytics → Akışlar → Dışa Aktar (.csv)'
              : platform === 'YOUTUBE'
              ? 'YouTube Studio → Analitik → Dışa aktar (.csv)'
              : platform === 'INSTAGRAM'
              ? 'Meta Business Suite → Analizler → Dışa Aktar'
              : 'Twitter/X Analytics → Tweets → Export Data'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
