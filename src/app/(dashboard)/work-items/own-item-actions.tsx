'use client';

/**
 * Çalışanın kendi TASLAK işi için Düzenle / Sil. Onaylanan iş kilitlidir;
 * bu bileşen yalnızca DRAFT satırlarda basılır, sunucu da ayrıca doğrular.
 */

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { deleteOwnWorkItem } from './new/actions';

export function OwnItemActions({ workItemId }: { workItemId: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/work-items/${workItemId}/duzenle`}
        title="Düzenle"
        aria-label="Düzenle"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <DeleteButton
        onDelete={() => deleteOwnWorkItem(workItemId)}
        description="Bu iş kaydı silinecek. Planlı yayından girdiysen plan yeniden açılır."
      />
    </div>
  );
}
