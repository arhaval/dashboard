'use client';

/**
 * Social Metric Delete Button
 * Admin-only trash icon with confirmation dialog
 */

import { DeleteButton } from '@/components/ui/delete-button';
import { deleteSocialMetric } from '../admin-actions';
import { tr } from '@/lib/i18n';

interface SocialMetricDeleteButtonProps {
  metricId: string;
  onDeleted?: () => void;
}

export function SocialMetricDeleteButton({
  metricId,
  onDeleted,
}: SocialMetricDeleteButtonProps) {
  const handleDelete = async () => {
    const result = await deleteSocialMetric(metricId);
    if (result.success && onDeleted) {
      onDeleted();
    }
    return result;
  };

  return (
    <DeleteButton
      onDelete={handleDelete}
      description={tr.confirm.deleteSocialMetric}
    />
  );
}
