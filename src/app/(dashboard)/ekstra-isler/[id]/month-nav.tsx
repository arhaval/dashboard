'use client';

import { MonthPicker } from '@/components/ui/month-picker';

export function ReportMonthNav({ month }: { month: string }) {
  return <MonthPicker month={month} />;
}
