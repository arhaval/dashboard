'use client';

/**
 * Payments Tabs Component
 * Switches between Planned Payments, Completed Payments, and Realized Transactions
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { CreditCard, CheckCircle, Receipt } from 'lucide-react';

type TabType = 'planned' | 'completed' | 'realized';

interface PaymentsTabsProps {
  activeTab: TabType;
}

export function PaymentsTabs({ activeTab }: PaymentsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // Clear filters when switching tabs
    params.delete('status');
    params.delete('user_id');
    params.delete('type');
    params.delete('category');
    router.push(`/payments?${params.toString()}`);
  };

  const tabs = [
    {
      id: 'planned' as TabType,
      label: tr.payment.tabs.planned,
      icon: CreditCard,
    },
    {
      id: 'completed' as TabType,
      label: tr.payment.tabs.completed,
      icon: CheckCircle,
    },
    {
      id: 'realized' as TabType,
      label: tr.payment.tabs.realized,
      icon: Receipt,
    },
  ];

  return (
    <div className="mb-6 flex border-b border-[var(--color-border)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
