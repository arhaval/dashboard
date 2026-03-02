'use client';

/**
 * Hook to access current user from DashboardShell context
 * Avoids prop drilling through deeply nested components
 */

import { createContext, useContext } from 'react';
import type { User } from '@/types';

interface CurrentUserContext {
  user: User;
  isAdmin: boolean;
}

export const CurrentUserContext = createContext<CurrentUserContext | null>(null);

export function useCurrentUser(): CurrentUserContext {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  return context;
}
