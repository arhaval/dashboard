'use client';

/**
 * Month Picker Component
 * Updates URL search params for month selection
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';

interface MonthPickerProps {
  months: string[];
  currentMonth: string;
}

function formatMonthOption(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

export function MonthPicker({ months, currentMonth }: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <Select value={currentMonth} onChange={handleChange} className="w-48">
      {months.map((month) => (
        <option key={month} value={month}>
          {formatMonthOption(month)}
        </option>
      ))}
    </Select>
  );
}
