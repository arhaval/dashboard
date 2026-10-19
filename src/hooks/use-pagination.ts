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
  const [requestedPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  /**
   * Geçerli sayfa okunurken sınırlanıyor, saklanırken değil.
   *
   * Eskiden liste kısaldığında `useMemo` içinden `setCurrentPage(1)`
   * çağrılıyordu — yani render sırasında durum değiştiriliyordu. React bunu
   * uyarıyla karşılar, fazladan render doğurur ve bazı durumlarda sayfa
   * sayısıyla içerik bir an için uyuşmaz. Türetmek bu sorunların hepsini
   * ortadan kaldırıyor: liste kısaldığı anda son geçerli sayfa gösterilir.
   */
  const currentPage = Math.min(requestedPage, totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    // Hareket, sınırlanmış sayfaya göre: saklanan değer sınırın üstünde
    // kaldıysa "geri" tıklamaları boşa gitmesin.
    nextPage: () => setCurrentPage(Math.min(currentPage + 1, totalPages)),
    prevPage: () => setCurrentPage(Math.max(currentPage - 1, 1)),
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  };
}
