'use client';

/**
 * Finance Export Buttons
 * CSV and PDF download for current month's financial data
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { Transaction } from '@/types';

interface FinanceExportButtonsProps {
  transactions: Transaction[];
  stats: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
  };
  currentMonth: string;
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

function formatAmount(amount: number | string): string {
  return Number(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FinanceExportButtons({
  transactions,
  stats,
  currentMonth,
}: FinanceExportButtonsProps) {
  const monthLabel = formatMonthLabel(currentMonth);

  const downloadCSV = useCallback(() => {
    const BOM = '\uFEFF';
    const headers = ['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Tutar'];
    const rows = transactions.map((t) => [
      new Date(t.transaction_date).toLocaleDateString('tr-TR'),
      t.type === 'INCOME' ? 'Gelir' : 'Gider',
      t.category,
      t.description || '',
      (t.type === 'INCOME' ? '+' : '-') + formatAmount(t.amount),
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['', '', '', 'Toplam Gelir', '+' + formatAmount(stats.totalIncome)]);
    rows.push(['', '', '', 'Toplam Gider', '-' + formatAmount(stats.totalExpenses)]);
    rows.push(['', '', '', 'Net Bakiye', formatAmount(stats.netBalance)]);

    const csv =
      BOM +
      [headers, ...rows]
        .map((row) =>
          (row as string[]).map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finans-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, stats, currentMonth]);

  const downloadPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text('Arhaval - Finansal Rapor', 14, 20);

    doc.setFontSize(12);
    doc.text(monthLabel, 14, 28);

    // Summary
    doc.setFontSize(10);
    const summaryY = 40;
    doc.text(`Toplam Gelir: ${formatAmount(stats.totalIncome)} TL`, 14, summaryY);
    doc.text(`Toplam Gider: ${formatAmount(stats.totalExpenses)} TL`, 14, summaryY + 6);
    doc.text(`Net Bakiye: ${formatAmount(stats.netBalance)} TL`, 14, summaryY + 12);
    doc.text(`Islem Sayisi: ${stats.transactionCount}`, 14, summaryY + 18);

    // Table header
    let y = summaryY + 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const cols = [14, 40, 70, 110, pageWidth - 30];
    doc.text('Tarih', cols[0], y);
    doc.text('Tur', cols[1], y);
    doc.text('Kategori', cols[2], y);
    doc.text('Aciklama', cols[3], y);
    doc.text('Tutar', cols[4], y, { align: 'right' });

    y += 2;
    doc.setLineWidth(0.3);
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    // Table rows
    doc.setFont('helvetica', 'normal');
    for (const t of transactions) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const dateStr = new Date(t.transaction_date).toLocaleDateString('tr-TR');
      const typeStr = t.type === 'INCOME' ? 'Gelir' : 'Gider';
      const amountStr = (t.type === 'INCOME' ? '+' : '-') + formatAmount(t.amount) + ' TL';

      doc.text(dateStr, cols[0], y);
      doc.text(typeStr, cols[1], y);
      doc.text(t.category.substring(0, 20), cols[2], y);
      doc.text((t.description || '').substring(0, 25), cols[3], y);
      doc.text(amountStr, cols[4], y, { align: 'right' });
      y += 6;
    }

    doc.save(`finans-${currentMonth}.pdf`);
  }, [transactions, stats, currentMonth, monthLabel]);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadCSV}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPDF}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        PDF
      </Button>
    </div>
  );
}
