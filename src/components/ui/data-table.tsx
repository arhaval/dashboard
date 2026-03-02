'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGINATION } from '@/constants';

// =============================================================================
// Types
// =============================================================================

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Header text */
  header: string;
  /** Render function for cell content */
  render: (row: T, index: number) => React.ReactNode;
  /** Text alignment */
  align?: 'left' | 'right' | 'center';
  /** Additional class for header and cells */
  className?: string;
  /** Whether this column is visible (default: true) */
  visible?: boolean;
}

export interface DataTableProps<T> {
  /** Data array to render */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key extractor for each row */
  rowKey: (row: T) => string;
  /** Optional empty state content */
  emptyState?: React.ReactNode;
  /** Empty state container height */
  emptyHeight?: string;
  /** Items per page (0 = no pagination) */
  pageSize?: number;
  /** Additional class for the wrapper */
  className?: string;
  /** Compact mode with less padding */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  emptyHeight = 'h-64',
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  className = '',
  compact = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible !== false),
    [columns],
  );

  // Pagination
  const totalItems = data.length;
  const isPaginated = pageSize > 0 && totalItems > pageSize;
  const totalPages = isPaginated ? Math.ceil(totalItems / pageSize) : 1;

  const paginatedData = useMemo(() => {
    if (!isPaginated) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, isPaginated]);

  // Reset page when data changes
  const dataLength = data.length;
  useMemo(() => {
    if (currentPage > 1 && (currentPage - 1) * pageSize >= dataLength) {
      setCurrentPage(1);
    }
  }, [dataLength, currentPage, pageSize]);

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  const alignClass = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] ${emptyHeight}`}
      >
        {emptyState || (
          <p className="text-sm text-[var(--color-text-muted)]">
            Veri bulunamadı
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Table */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`${cellPadding} text-sm font-medium text-[var(--color-text-secondary)] ${alignClass(col.align)} ${col.className ?? ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => {
                const globalIndex = isPaginated
                  ? (currentPage - 1) * pageSize + index
                  : index;

                return (
                  <tr
                    key={rowKey(row)}
                    className={`border-b border-[var(--color-border)] last:border-b-0 ${
                      globalIndex % 2 === 0
                        ? 'bg-[var(--color-table-row-even)]'
                        : 'bg-[var(--color-table-row-odd)]'
                    }`}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPadding} text-sm ${alignClass(col.align)} ${col.className ?? ''}`}
                      >
                        {col.render(row, globalIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {isPaginated && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            {totalItems} kayıttan{' '}
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, totalItems)} arası
            gösteriliyor
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-[80px] text-center text-sm text-[var(--color-text-secondary)]">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
