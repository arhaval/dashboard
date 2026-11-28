'use client';

/**
 * Payments Tabs Component
 * Switches between Planned Payments, Completed Payments, and Realized Transactions
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui/tabs';
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
    <Tabs
      className="mb-6"
      items={tabs.map((tab) => ({
        key: tab.id,
        label: tab.label,
        icon: tab.icon,
        active: activeTab === tab.id,
        onClick: () => handleTabChange(tab.id),
      }))}
    />
  );
}
