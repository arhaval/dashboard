'use client';

/**
 * Pagination hook for client-side data slicing
 * Used when data is already loaded and needs client-side pagination
 */

import { useState, useMemo } from 'react';
import { PAGINATION } from '@/constants';

interface UsePaginationOptions {
  totalItems: number;
  pageSize?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function usePagination({
  totalItems,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  // Reset to page 1 if current page exceeds total
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    nextPage: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  };
}
