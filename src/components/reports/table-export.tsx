'use client';

/**
 * Tablo dışa aktarma — Excel (CSV) + PDF. Tüm döküm/rapor ekranlarının ortak
 * aracı (Ekstra iş raporu, kişisel aylık döküm…).
 *
 * CSV: UTF-8 BOM + `;` ayraç → Türkçe Excel doğrudan açar.
 * PDF: jsPDF'in gömülü Helvetica'sı Türkçe karakter basamadığı için metinler
 * ASCII'ye çevrilir (ş→s, ğ→g…). jsPDF yalnızca tıklanınca yüklenir.
 */

import { useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ExportColumn {
  label: string;
  /** Göreli genişlik (varsayılan 1). */
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface TableExportProps {
  /** Dosya adı (uzantısız). Boşluklar tireye çevrilir. */
  fileName: string;
  /** PDF başlığı ve alt başlığı. */
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: string[][];
  /** Tablo altı toplam satırı (sütun sayısı kadar hücre). */
  footer?: string[];
}

const TR_ASCII: Record<string, string> = {
  ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ç: 'c', Ç: 'C', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U', '₺': 'TL',
};
const toAscii = (s: string) => s.replace(/[şŞğĞıİçÇöÖüÜ₺]/g, (c) => TR_ASCII[c] ?? c);

const PAGE_MARGIN_MM = 14;
const ROW_HEIGHT_MM = 6;
const PAGE_BOTTOM_MM = 275;

export function TableExport({ fileName, title, subtitle, columns, rows, footer }: TableExportProps) {
  const base = fileName.replace(/\s+/g, '-');

  const downloadCSV = useCallback(() => {
    const BOM = '﻿';
    const all = [columns.map((c) => c.label), ...rows];
    if (footer) all.push([], footer);
    const csv =
      BOM + all.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [base, columns, rows, footer]);

  const downloadPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const usable = pageWidth - PAGE_MARGIN_MM * 2;
    const totalWeight = columns.reduce((s, c) => s + (c.width ?? 1), 0);

    // Her sütunun hizaya göre metin x'i
    let cursor = PAGE_MARGIN_MM;
    const layout = columns.map((c) => {
      const w = (usable * (c.width ?? 1)) / totalWeight;
      const align = c.align ?? 'left';
      const x = align === 'right' ? cursor + w : align === 'center' ? cursor + w / 2 : cursor;
      const maxChars = Math.max(4, Math.floor(w / 1.9));
      cursor += w;
      return { x, align, maxChars };
    });

    const writeRow = (cells: string[], y: number) =>
      cells.forEach((cell, i) => {
        const l = layout[i];
        if (!l) return;
        doc.text(toAscii(String(cell)).substring(0, l.maxChars), l.x, y, { align: l.align });
      });

    doc.setFontSize(18);
    doc.text(toAscii(title), PAGE_MARGIN_MM, 20);
    if (subtitle) {
      doc.setFontSize(12);
      doc.text(toAscii(subtitle), PAGE_MARGIN_MM, 28);
    }

    let y = 42;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    writeRow(columns.map((c) => c.label), y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN_MM, y, pageWidth - PAGE_MARGIN_MM, y);
    y += ROW_HEIGHT_MM;

    doc.setFont('helvetica', 'normal');
    for (const r of rows) {
      if (y > PAGE_BOTTOM_MM) {
        doc.addPage();
        y = 20;
      }
      writeRow(r, y);
      y += ROW_HEIGHT_MM;
    }

    if (footer) {
      y += 2;
      doc.line(PAGE_MARGIN_MM, y, pageWidth - PAGE_MARGIN_MM, y);
      y += 7;
      doc.setFont('helvetica', 'bold');
      writeRow(footer, y);
    }

    doc.save(`${base}.pdf`);
  }, [base, title, subtitle, columns, rows, footer]);

  const disabled = rows.length === 0;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadCSV} disabled={disabled}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPDF} disabled={disabled}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        PDF
      </Button>
    </div>
  );
}
