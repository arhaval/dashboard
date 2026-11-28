'use client';

/**
 * Alacak satırı aksiyonları — iki adımlı satır içi onay (yanlışlıkla
 * tıklanınca deftere gelir yazılmasın). Tüm alacak türleri aynı düğmeyi
 * kullanır; sadece çağrılan action değişir.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  collectClientMonthAction,
  markSponsorDueAction,
  markExpectedIncomeAction,
} from './actions';

type Result = { success: boolean; error?: string };

function ConfirmAction({
  label,
  confirmLabel,
  run,
  variant = 'primary',
}: {
  label: string;
  confirmLabel: string;
  run: () => Promise<Result>;
  variant?: 'primary' | 'ghost';
}) {
  const router = useRouter();
  const [armed, setArmed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const base = 'inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-[var(--radius-md)] px-2.5 text-xs font-medium transition-colors disabled:opacity-50';

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={cn(
          base,
          variant === 'primary'
            ? 'border border-[var(--color-border-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await run();
            if (!res.success) {
              setError(res.error ?? 'İşlem başarısız');
              return;
            }
            setArmed(false);
            router.refresh();
          })
        }
        className={cn(base, 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90')}
      >
        <Check className="h-3.5 w-3.5" />
        {pending ? 'Kaydediliyor…' : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={cn(base, 'text-[var(--color-text-muted)]')}>
        Vazgeç
      </button>
      {error && <span className="text-[11px] text-[var(--color-error)]">{error}</span>}
    </span>
  );
}

export function CollectClientButton({ clientId, month, amount }: { clientId: string; month: string; amount: number }) {
  return (
    <ConfirmAction
      label="Tahsil edildi"
      confirmLabel="Gelir olarak yaz"
      run={() => collectClientMonthAction({ clientId, month, amount })}
    />
  );
}

export function SponsorDueButtons({ paymentId }: { paymentId: string }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      <ConfirmAction label="Tahsil edildi" confirmLabel="Gelir olarak yaz" run={() => markSponsorDueAction(paymentId, true)} />
      <ConfirmAction
        label="Zaten girildi"
        confirmLabel="Sadece işaretle"
        variant="ghost"
        run={() => markSponsorDueAction(paymentId, false)}
      />
    </span>
  );
}

export function ExpectedIncomeButton({ id }: { id: string }) {
  return <ConfirmAction label="Tahsil edildi" confirmLabel="Gelir olarak yaz" run={() => markExpectedIncomeAction(id)} />;
}
