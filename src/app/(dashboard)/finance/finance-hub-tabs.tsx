'use client';

/**
 * Finance Hub Tabs
 * Top-level section navigation that unifies Finans, Ödemeler and Nakit Akışı
 * under one roof. Rendered at the top of each of those admin pages.
 */

import { PiggyBank, CreditCard, TrendingUp } from 'lucide-react';
import { LinkTabs } from '@/components/ui/link-tabs';

export function FinanceHubTabs() {
  return (
    <LinkTabs
      className="mb-6"
      items={[
        { href: '/finance', label: 'Finans', icon: PiggyBank },
        { href: '/payments', label: 'Ödemeler', icon: CreditCard },
        { href: '/nakit', label: 'Nakit Akışı', icon: TrendingUp },
      ]}
    />
  );
}
